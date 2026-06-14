import { getAdminUser } from "@/lib/auth";
import { posSaleSchema } from "@/lib/validations";
import { createOrderWithItems } from "@/lib/orders";
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

export async function POST(request: Request) {
  const rl = checkRateLimit(request, "pos-sale", 60, 60000);
  if (!rl.success) return rateLimited();

  const admin = await getAdminUser();
  if (!admin) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = posSaleSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Validation failed", 400, parseZodError(parsed.error));
  }

  const data = parsed.data;

  try {
    const result = await createOrderWithItems({
      items: data.items,
      customerName: data.customerName || "Walk-in Customer",
      customerPhone: data.customerPhone,
      type: "OFFLINE",
      paymentMethod: data.paymentMethod,
      orderDiscount: data.discount,
      createInvoice: true,
    });

    const meta = getRequestMeta(request);
    await createAuditLog({
      adminId: admin.id,
      action: "CREATE",
      entity: "pos_sale",
      entityId: result.order.id,
      details: {
        orderNumber: result.order.orderNumber,
        total: result.order.grandTotal,
        paymentMethod: data.paymentMethod,
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return successResponse(
      {
        order: result.order,
        invoice: result.invoice,
      },
      201
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "POS sale failed";
    return errorResponse(message, 400);
  }
}
