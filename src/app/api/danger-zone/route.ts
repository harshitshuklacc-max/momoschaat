import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth";
import { dangerZoneSchema } from "@/lib/validations";
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

const dangerZoneActionSchema = dangerZoneSchema.extend({
  action: z
    .enum(["factory_reset", "bulk_delete_products", "bulk_delete_orders"])
    .default("factory_reset"),
  entityIds: z.array(z.string()).optional(),
});

export async function POST(request: Request) {
  const rl = checkRateLimit(request, "danger-zone", 3, 60000);
  if (!rl.success) return rateLimited();

  const admin = await getAdminUser();
  if (!admin) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = dangerZoneActionSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Validation failed", 400, parseZodError(parsed.error));
  }

  const envPassword = process.env.ADMIN_PASSWORD;
  if (!envPassword) {
    return errorResponse("Admin password not configured", 500);
  }

  if (parsed.data.password !== envPassword) {
    return errorResponse("Invalid admin password", 403);
  }

  const { action, entityIds } = parsed.data;
  const meta = getRequestMeta(request);

  try {
    if (action === "factory_reset") {
      await prisma.$transaction(async (tx) => {
        await tx.inventoryLog.deleteMany();
        await tx.refund.deleteMany();
        await tx.return.deleteMany();
        await tx.orderItem.deleteMany();
        await tx.paymentVerification.deleteMany();
        await tx.payment.deleteMany();
        await tx.invoiceItem.deleteMany();
        await tx.invoice.deleteMany();
        await tx.order.deleteMany();
        await tx.review.deleteMany();
        await tx.wishlist.deleteMany();
        await tx.address.deleteMany();
        await tx.notification.deleteMany();
        await tx.productImage.deleteMany();
        await tx.barcode.deleteMany();
        await tx.inventory.deleteMany();
        await tx.product.deleteMany();
        await tx.busyImportLog.deleteMany();
        await tx.auditLog.deleteMany();
        await tx.session.deleteMany({ where: { userId: { not: null } } });
        await tx.customer.deleteMany();
        await tx.user.deleteMany();
        await tx.coupon.deleteMany();
        await tx.heroBanner.deleteMany();
        await tx.homepageSetting.deleteMany();
      });

      await createAuditLog({
        adminId: admin.id,
        action: "FACTORY_RESET",
        entity: "system",
        details: { action },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });

      return successResponse({
        message: "Factory reset completed. Admin account preserved.",
        action,
      });
    }

    if (action === "bulk_delete_products") {
      if (!entityIds?.length) {
        return errorResponse("entityIds required for bulk delete", 400);
      }

      const result = await prisma.product.deleteMany({
        where: { id: { in: entityIds } },
      });

      await createAuditLog({
        adminId: admin.id,
        action: "BULK_DELETE",
        entity: "product",
        details: { entityIds, count: result.count },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });

      return successResponse({
        message: `Deleted ${result.count} products`,
        deleted: result.count,
      });
    }

    if (action === "bulk_delete_orders") {
      if (!entityIds?.length) {
        return errorResponse("entityIds required for bulk delete", 400);
      }

      const result = await prisma.order.deleteMany({
        where: { id: { in: entityIds } },
      });

      await createAuditLog({
        adminId: admin.id,
        action: "BULK_DELETE",
        entity: "order",
        details: { entityIds, count: result.count },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });

      return successResponse({
        message: `Deleted ${result.count} orders`,
        deleted: result.count,
      });
    }

    return errorResponse("Unknown action", 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Danger zone action failed";
    return errorResponse(message, 500);
  }
}
