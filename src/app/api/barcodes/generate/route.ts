import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth";
import { generateBarcodeValue } from "@/lib/barcode";
import { createAuditLog } from "@/lib/audit";
import { getSetting } from "@/lib/settings";
import {
  checkRateLimit,
  errorResponse,
  getRequestMeta,
  parseZodError,
  rateLimited,
  successResponse,
  unauthorized,
} from "@/lib/api";
import type { BarcodeType } from "@prisma/client";

const generateSchema = z.object({
  productIds: z.array(z.string()).min(1),
  type: z.enum(["CODE128", "EAN13", "QR"]).optional(),
  regenerate: z.boolean().default(false),
});

export async function POST(request: Request) {
  const rl = checkRateLimit(request, "barcode-generate", 20, 60000);
  if (!rl.success) return rateLimited();

  const admin = await getAdminUser();
  if (!admin) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Validation failed", 400, parseZodError(parsed.error));
  }

  const defaultType = await getSetting<BarcodeType>("barcode_type", "CODE128");
  const barcodeType = (parsed.data.type || defaultType) as BarcodeType;

  const products = await prisma.product.findMany({
    where: { id: { in: parsed.data.productIds } },
    include: { barcode: true },
  });

  const results: Array<{ productId: string; value: string; status: string }> = [];

  for (const product of products) {
    if (product.barcode && !parsed.data.regenerate) {
      results.push({
        productId: product.id,
        value: product.barcode.value,
        status: "existing",
      });
      continue;
    }

    const value = generateBarcodeValue(product.sku, barcodeType);

    if (product.barcode) {
      await prisma.barcode.update({
        where: { productId: product.id },
        data: { value, type: barcodeType },
      });
    } else {
      await prisma.barcode.create({
        data: { productId: product.id, value, type: barcodeType },
      });
    }

    results.push({ productId: product.id, value, status: "generated" });
  }

  const meta = getRequestMeta(request);
  await createAuditLog({
    adminId: admin.id,
    action: "CREATE",
    entity: "barcode",
    details: { count: results.length, type: barcodeType },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return successResponse({ barcodes: results });
}
