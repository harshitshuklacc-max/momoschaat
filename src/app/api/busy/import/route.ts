import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth";
import { parseBusyPDF } from "@/lib/busy-pdf";
import { generateBarcodeValue } from "@/lib/barcode";
import { createAuditLog } from "@/lib/audit";
import { slugify, generateSKU } from "@/lib/utils";
import {
  checkRateLimit,
  errorResponse,
  getRequestMeta,
  rateLimited,
  successResponse,
  unauthorized,
} from "@/lib/api";

export async function POST(request: Request) {
  const rl = checkRateLimit(request, "busy-import", 5, 60000);
  if (!rl.success) return rateLimited();

  const admin = await getAdminUser();
  if (!admin) return unauthorized();

  const formData = await request.formData().catch(() => null);
  if (!formData) return errorResponse("Invalid form data", 400);

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return errorResponse("PDF file is required", 400);
  }

  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return errorResponse("Only PDF files are supported", 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let rows;
  try {
    rows = await parseBusyPDF(buffer);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to parse PDF";
    return errorResponse(message, 400);
  }

  if (rows.length === 0) {
    return errorResponse("No products found in PDF", 400);
  }

  let defaultBrand = await prisma.brand.findFirst({ where: { slug: "busy-import" } });
  if (!defaultBrand) {
    defaultBrand = await prisma.brand.create({
      data: { name: "Busy Import", slug: "busy-import" },
    });
  }

  let defaultCategory = await prisma.category.findFirst({
    where: { slug: "uncategorized" },
  });
  if (!defaultCategory) {
    defaultCategory = await prisma.category.create({
      data: { name: "Uncategorized", slug: "uncategorized" },
    });
  }

  let addedCount = 0;
  let updatedCount = 0;
  const skippedCount = 0;
  let failedCount = 0;
  const details: Array<{ name: string; status: string; message?: string }> = [];

  for (const row of rows) {
    try {
      const sku = row.sku || generateSKU("BUS", row.name);
      const barcodeValue = row.barcode || generateBarcodeValue(sku);

      const existing = await prisma.product.findFirst({
        where: {
          OR: [
            { sku },
            { barcode: { value: barcodeValue } },
            { name: { equals: row.name, mode: "insensitive" } },
          ],
        },
        include: { inventory: true, barcode: true },
      });

      if (existing) {
        await prisma.$transaction(async (tx) => {
          await tx.product.update({
            where: { id: existing.id },
            data: {
              mrp: row.mrp,
              sellingPrice: row.sellingPrice,
            },
          });

          if (existing.inventory) {
            const qtyChange = row.stock - existing.inventory.quantity;
            if (qtyChange !== 0) {
              const previousQty = existing.inventory.quantity;
              const newQty = row.stock;
              await tx.inventory.update({
                where: { productId: existing.id },
                data: { quantity: newQty },
              });
              await tx.inventoryLog.create({
                data: {
                  inventoryId: existing.inventory.id,
                  action: "BUSY_IMPORT",
                  quantity: Math.abs(qtyChange),
                  previousQty,
                  newQty,
                  notes: "Busy PDF import update",
                },
              });
            }
          }
        });
        updatedCount++;
        details.push({ name: row.name, status: "updated" });
      } else {
        const slug = slugify(row.name);
        const uniqueSlug = `${slug}-${Date.now().toString(36)}`;

        await prisma.product.create({
          data: {
            name: row.name,
            slug: uniqueSlug,
            brandId: defaultBrand.id,
            categoryId: defaultCategory.id,
            mrp: row.mrp,
            sellingPrice: row.sellingPrice,
            sku,
            status: "ACTIVE",
            inventory: { create: { quantity: row.stock } },
            barcode: { create: { value: barcodeValue, type: "CODE128" } },
          },
        });
        addedCount++;
        details.push({ name: row.name, status: "added" });
      }
    } catch (err) {
      failedCount++;
      details.push({
        name: row.name,
        status: "failed",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  const importLog = await prisma.busyImportLog.create({
    data: {
      adminId: admin.id,
      fileName: file.name,
      totalRows: rows.length,
      addedCount,
      updatedCount,
      skippedCount,
      failedCount,
      details,
      status: failedCount > 0 ? "completed_with_errors" : "completed",
    },
  });

  const meta = getRequestMeta(request);
  await createAuditLog({
    adminId: admin.id,
    action: "IMPORT",
    entity: "busy_pdf",
    entityId: importLog.id,
    details: { addedCount, updatedCount, failedCount, totalRows: rows.length },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return successResponse({
    importLog,
    summary: { addedCount, updatedCount, skippedCount, failedCount, totalRows: rows.length },
  });
}
