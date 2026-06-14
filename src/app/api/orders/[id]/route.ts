import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminUser, getAuthUser } from "@/lib/auth";
import { updateInventory } from "@/lib/inventory";
import { createAuditLog } from "@/lib/audit";
import { ORDER_STATUSES } from "@/lib/constants";
import {
  checkRateLimit,
  errorResponse,
  getRequestMeta,
  notFound,
  parseZodError,
  rateLimited,
  successResponse,
  unauthorized,
} from "@/lib/api";

const statusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  notes: z.string().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = checkRateLimit(request, "orders-detail", 60, 60000);
  if (!rl.success) return rateLimited();

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { include: { product: { select: { id: true, name: true, images: { take: 1 } } } } },
      payments: { include: { verification: true } },
      customer: true,
      invoice: true,
    },
  });

  if (!order) return notFound("Order not found");

  const admin = await getAdminUser();
  if (!admin) {
    const user = await getAuthUser();
    if (!user?.customer || order.customerId !== user.customer.id) {
      return unauthorized();
    }
  }

  return successResponse(order);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = checkRateLimit(request, "orders-update", 30, 60000);
  if (!rl.success) return rateLimited();

  const admin = await getAdminUser();
  if (!admin) return unauthorized();

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!order) return notFound("Order not found");

  const body = await request.json().catch(() => null);
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Validation failed", 400, parseZodError(parsed.error));
  }

  const { status, notes } = parsed.data;
  const previousStatus = order.status;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.order.update({
        where: { id },
        data: {
          status,
          notes: notes ? `${order.notes || ""}\n${notes}`.trim() : order.notes,
        },
        include: {
          items: true,
          payments: true,
        },
      });

      if (
        (status === "CANCELLED" || status === "RETURNED") &&
        previousStatus !== "CANCELLED" &&
        previousStatus !== "RETURNED"
      ) {
        const action = status === "CANCELLED" ? "CANCELLATION" : "RETURN";
        for (const item of order.items) {
          await updateInventory(
            item.productId,
            item.quantity,
            action,
            order.orderNumber,
            `Order ${status.toLowerCase()}`,
            tx
          );
        }
      }

      if (status === "DELIVERED") {
        await tx.payment.updateMany({
          where: { orderId: id, status: "PENDING" },
          data: { status: "COMPLETED" },
        });
      }

      return result;
    });

    const meta = getRequestMeta(request);
    await createAuditLog({
      adminId: admin.id,
      action: "UPDATE",
      entity: "order",
      entityId: id,
      details: { previousStatus, newStatus: status },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return successResponse(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update order";
    return errorResponse(message, 500);
  }
}
