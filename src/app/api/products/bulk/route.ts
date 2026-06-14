import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import {
  checkRateLimit,
  errorResponse,
  getRequestMeta,
  parseZodError,
  rateLimited,
  successResponse,
  unauthorized,
} from "@/lib/api";

const bulkSchema = z.object({
  action: z.enum(["update", "delete"]),
  productIds: z.array(z.string()).min(1),
  updates: z
    .object({
      status: z.enum(["ACTIVE", "DISABLED", "DRAFT"]).optional(),
      isFeatured: z.boolean().optional(),
      isTrending: z.boolean().optional(),
      isNewArrival: z.boolean().optional(),
      isBestSeller: z.boolean().optional(),
      brandId: z.string().optional(),
      categoryId: z.string().optional(),
    })
    .optional(),
});

export async function POST(request: Request) {
  const rl = checkRateLimit(request, "products-bulk", 10, 60000);
  if (!rl.success) return rateLimited();

  const admin = await getAdminUser();
  if (!admin) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Validation failed", 400, parseZodError(parsed.error));
  }

  const { action, productIds, updates } = parsed.data;
  const meta = getRequestMeta(request);

  if (action === "delete") {
    const result = await prisma.product.deleteMany({
      where: { id: { in: productIds } },
    });

    await createAuditLog({
      adminId: admin.id,
      action: "BULK_DELETE",
      entity: "product",
      details: { productIds, count: result.count },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return successResponse({ deleted: result.count });
  }

  if (!updates || Object.keys(updates).length === 0) {
    return errorResponse("Updates required for bulk update", 400);
  }

  const result = await prisma.product.updateMany({
    where: { id: { in: productIds } },
    data: updates,
  });

  await createAuditLog({
    adminId: admin.id,
    action: "BULK_UPDATE",
    entity: "product",
    details: { productIds, updates, count: result.count },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return successResponse({ updated: result.count });
}
