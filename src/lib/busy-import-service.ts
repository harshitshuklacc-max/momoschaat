import { prisma } from "./prisma";
import { getAdminUser } from "./auth";
import { generateBarcodeValue } from "./barcode";
import { createAuditLog } from "./audit";
import { updateInventory } from "./inventory";
import { parseBusyPDF, type BusyProductRow } from "./busy-pdf";
import { slugify, generateSKU, calculateDiscount } from "./utils";

export interface BusyImportDetail {
  row: number;
  name: string;
  status: "added" | "updated" | "skipped" | "failed";
  message?: string;
}

export interface BusyImportResult {
  id: string;
  fileName: string;
  totalRows: number;
  added: number;
  updated: number;
  skipped: number;
  failed: number;
  details: BusyImportDetail[];
}

async function ensureDefaultBrandAndCategory() {
  let brand = await prisma.brand.findFirst({ where: { slug: "busy-import" } });
  if (!brand) {
    brand = await prisma.brand.create({
      data: { name: "Busy Import", slug: "busy-import", isActive: true },
    });
  }

  let category = await prisma.category.findFirst({ where: { slug: "uncategorized" } });
  if (!category) {
    category = await prisma.category.create({
      data: { name: "Uncategorized", slug: "uncategorized", isActive: true },
    });
  }

  return { brand, category };
}

async function findExistingProduct(row: BusyProductRow, sku: string) {
  const barcodeValue = row.barcode || undefined;

  return prisma.product.findFirst({
    where: {
      OR: [
        { sku },
        ...(barcodeValue ? [{ barcode: { value: barcodeValue } }] : []),
        { name: { equals: row.name, mode: "insensitive" } },
      ],
    },
    include: { inventory: true, barcode: true },
  });
}

async function syncProductRow(
  row: BusyProductRow,
  rowIndex: number,
  brandId: string,
  categoryId: string,
  fileName: string
): Promise<BusyImportDetail> {
  const sku = row.sku?.trim() || generateSKU("BUS", row.name);
  const stock = row.stock ?? row.quantity ?? 0;
  const mrp = Number(row.mrp) || 0;
  const sellingPrice = Number(row.sellingPrice) || mrp;

  if (!row.name?.trim()) {
    return { row: rowIndex, name: "Unknown", status: "skipped", message: "Missing product name" };
  }

  if (mrp <= 0 && sellingPrice <= 0) {
    return {
      row: rowIndex,
      name: row.name,
      status: "skipped",
      message: "Missing valid price",
    };
  }

  const existing = await findExistingProduct(row, sku);

  if (existing) {
    await prisma.product.update({
      where: { id: existing.id },
      data: {
        mrp: mrp || Number(existing.mrp),
        sellingPrice: sellingPrice || Number(existing.sellingPrice),
        discount: calculateDiscount(mrp || Number(existing.mrp), sellingPrice || Number(existing.sellingPrice)),
      },
    });

    if (existing.inventory) {
      const diff = stock - existing.inventory.quantity;
      if (diff !== 0) {
        await updateInventory(
          existing.id,
          diff,
          "BUSY_IMPORT",
          fileName,
          `BUSY import stock sync: ${row.name}`
        );
      }
    } else {
      await prisma.inventory.create({
        data: { productId: existing.id, quantity: stock, minStock: 5 },
      });
    }

    return { row: rowIndex, name: row.name, status: "updated" };
  }

  const barcodeValue = row.barcode?.trim() || generateBarcodeValue(sku);
  const uniqueSlug = `${slugify(row.name)}-${Date.now().toString(36)}`;

  await prisma.product.create({
    data: {
      name: row.name.trim(),
      slug: uniqueSlug,
      brandId,
      categoryId,
      mrp: mrp || sellingPrice,
      sellingPrice: sellingPrice || mrp,
      discount: calculateDiscount(mrp || sellingPrice, sellingPrice || mrp),
      sku,
      status: "ACTIVE",
      inventory: { create: { quantity: stock, minStock: 5 } },
      barcode: { create: { value: barcodeValue, type: "CODE128" } },
    },
  });

  return { row: rowIndex, name: row.name, status: "added" };
}

export async function processBusyImport(
  buffer: Buffer,
  fileName: string,
  adminId: string
): Promise<BusyImportResult> {
  const rows = await parseBusyPDF(buffer);

  if (rows.length === 0) {
    throw new Error(
      "No products found in PDF. Ensure you exported a BUSY stock/item list PDF with product names, prices, and quantities."
    );
  }

  const { brand, category } = await ensureDefaultBrandAndCategory();
  const details: BusyImportDetail[] = [];
  let added = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i++) {
    try {
      const result = await syncProductRow(rows[i], i + 1, brand.id, category.id, fileName);
      details.push(result);

      if (result.status === "added") added++;
      else if (result.status === "updated") updated++;
      else if (result.status === "skipped") skipped++;
    } catch (err) {
      failed++;
      details.push({
        row: i + 1,
        name: rows[i].name || "Unknown",
        status: "failed",
        message: err instanceof Error ? err.message : "Import failed",
      });
    }
  }

  const log = await prisma.busyImportLog.create({
    data: {
      adminId,
      fileName,
      totalRows: rows.length,
      addedCount: added,
      updatedCount: updated,
      skippedCount: skipped,
      failedCount: failed,
      details: JSON.parse(JSON.stringify(details)),
      status: failed > 0 ? "completed_with_errors" : "completed",
    },
  });

  await createAuditLog({
    adminId,
    action: "IMPORT",
    entity: "busy_import",
    entityId: log.id,
    details: { fileName, added, updated, skipped, failed, totalRows: rows.length },
  });

  return {
    id: log.id,
    fileName,
    totalRows: rows.length,
    added,
    updated,
    skipped,
    failed,
    details,
  };
}

export async function listBusyImportLogs() {
  return prisma.busyImportLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { admin: { select: { username: true } } },
  });
}

export async function requireAdminForImport() {
  const admin = await getAdminUser();
  if (!admin) return null;
  return admin;
}
