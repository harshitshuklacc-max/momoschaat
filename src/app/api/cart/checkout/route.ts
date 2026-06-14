import { z } from "zod";
import { getAuthUser } from "@/lib/auth";
import { checkoutSchema } from "@/lib/validations";
import {
  applyCoupon,
  createOrderWithItems,
  incrementCouponUsage,
  validateAndPriceItems,
} from "@/lib/orders";
import { getSetting } from "@/lib/settings";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  errorResponse,
  parseZodError,
  rateLimited,
  successResponse,
} from "@/lib/api";

const checkoutWithItemsSchema = checkoutSchema.extend({
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.coerce.number().int().positive(),
        discount: z.coerce.number().min(0).default(0),
      })
    )
    .min(1),
  upiReference: z.string().optional(),
  screenshotUrl: z.string().optional(),
});

export async function POST(request: Request) {
  const rl = checkRateLimit(request, "cart-checkout", 20, 60000);
  if (!rl.success) return rateLimited();

  const body = await request.json().catch(() => null);
  const parsed = checkoutWithItemsSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Validation failed", 400, parseZodError(parsed.error));
  }

  const data = parsed.data;
  const user = await getAuthUser();
  const customerId = user?.customer?.id;

  try {
    const { subtotal } = await validateAndPriceItems(data.items);

    let orderDiscount = 0;
    let couponId: string | undefined;

    if (data.couponCode) {
      const couponResult = await applyCoupon(data.couponCode, subtotal);
      orderDiscount = couponResult.discount;
      couponId = couponResult.couponId;
    }

    const taxEnabled = await getSetting<boolean>("tax_enabled", false);
    const taxRate = await getSetting<number>("tax_rate", 0);
    const tax = taxEnabled ? ((subtotal - orderDiscount) * taxRate) / 100 : 0;

    const customerName =
      data.customerName ||
      (user?.customer
        ? `${user.customer.firstName} ${user.customer.lastName}`
        : "Guest");

    const result = await createOrderWithItems({
      items: data.items,
      customerId,
      customerName,
      customerPhone: data.customerPhone,
      customerEmail: data.customerEmail || user?.email,
      type: "ONLINE",
      paymentMethod: data.paymentMethod,
      shippingAddress: data.shippingAddress,
      notes: data.notes,
      orderDiscount,
      tax,
      shipping: 0,
    });

    if (couponId) {
      await incrementCouponUsage(couponId);
    }

    if (data.paymentMethod === "UPI" && (data.upiReference || data.screenshotUrl)) {
      const payment = result.order.payments[0];
      await prisma.paymentVerification.update({
        where: { paymentId: payment.id },
        data: {
          upiReference: data.upiReference,
          screenshotUrl: data.screenshotUrl,
        },
      });
    }

    if (customerId) {
      await prisma.notification.create({
        data: {
          customerId,
          title: "Order Placed",
          message: `Your order ${result.order.orderNumber} has been placed successfully.`,
          type: "ORDER",
          data: { orderId: result.order.id, orderNumber: result.order.orderNumber },
        },
      });
    }

    return successResponse(
      {
        order: result.order,
        invoice: result.invoice,
        summary: {
          subtotal,
          discount: orderDiscount,
          tax,
          grandTotal: result.order.grandTotal,
        },
      },
      201
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout failed";
    return errorResponse(message, 400);
  }
}
