import { prisma } from "@/lib/prisma";
import { withAdmin } from "@/lib/api-auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { parseBusyPDF } from "@/lib/busy-pdf";
import { generateBarcodeValue } from "@/lib/barcode";
import { slugify, generateSKU, calculateDiscount } from "@/lib/utils";
import { createAuditLog } from "@/lib/audit";
import { updateInventory } from "@/lib/inventory";

export async function POST(request: Request) {
  return withAdmin(async (admin) => {
    try {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (!file) return jsonError("PDF file is required");

      const buffer = Buffer.from(await file.arrayBuffer());
      const rows = await parseBusyPDF(buffer);

      let addedCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;
      let failedCount = 0;
      const details: { row: number; name: string; status: string; message?: string }[] = [];

      const defaultBrand = await prisma.brand.findFirst({ where: { isActive: true } });
      const defaultCategory = await prisma.category.findFirst({ where: { isActive: true } });

      if (!defaultBrand || !defaultCategory) {
        return jsonError("Please create at least one brand and category before importing");
      }

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          const sku = row.sku || generateSKU(defaultBrand.name, row.name);
          const existing = await prisma.product.findFirst({
            where: {
              OR: [
                { sku },
                ...(row.barcode ? [{ barcode: { value: row.barcode } }] : []),
              ],
            },
            include: { inventory: true, barcode: true },
          });

          if (existing) {
            await prisma.product.update({
              where: { id: existing.id },
              data: {
                mrp: row.mrp,
                sellingPrice: row.sellingPrice,
                discount: calculateDiscount(row.mrp, row.sellingPrice),
              },
            });

            if (existing.inventory && row.stock !== existing.inventory.quantity) {
              const diff = row.stock - existing.inventory.quantity;
              await updateInventory(
                existing.id,
                diff,
                "BUSY_IMPORT",
                undefined,
                `BUSY import: ${file.name}`
              );
            }

            updatedCount++;
            details.push({ row: i + 1, name: row.name, status: "updated" });
            continue;
          }

          const productSku = sku;
          await prisma.product.create({
            data: {
              name: row.name,
              slug: slugify(`${row.name}-${productSku}-${Date.now()}`),
              brandId: defaultBrand.id,
              categoryId: defaultCategory.id,
              mrp: row.mrp,
              sellingPrice: row.sellingPrice,
              discount: calculateDiscount(row.mrp, row.sellingPrice),
              sku: productSku,
              status: "ACTIVE",
              inventory: { create: { quantity: row.stock, minStock: 5 } },
              barcode: {
                create: {
                  value: row.barcode || generateBarcodeValue(productSku),
                  type: "CODE128",
                },
              },
            },
          });

          addedCount++;
          details.push({ row: i + 1, name: row.name, status: "added" });
        } catch (err) {
          failedCount++;
          details.push({
            row: i + 1,
            name: row.name,
            status: "failed",
            message: err instanceof Error ? err.message : "Unknown error",
          });
        }
      }

      if (rows.length === 0) {
        skippedCount = 1;
      }

      const log = await prisma.busyImportLog.create({
        data: {
          adminId: admin.id,
          fileName: file.name,
          totalRows: rows.length,
          addedCount,
          updatedCount,
          skippedCount,
          failedCount,
          details,
        },
      });

      await createAuditLog({
        adminId: admin.id,
        action: "IMPORT",
        entity: "busy_import",
        entityId: log.id,
        details: { fileName: file.name, addedCount, updatedCount, failedCount },
      });

      return jsonOk({
        id: log.id,
        fileName: file.name,
        totalRows: rows.length,
        added: addedCount,
        updated: updatedCount,
        skipped: skippedCount,
        failed: failedCount,
        details,
      });
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : "Import failed", 500);
    }
  });
}

export async function GET() {
  return withAdmin(async () => {
    const logs = await prisma.busyImportLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { admin: { select: { username: true } } },
    });
    return jsonOk(logs);
  });
}
