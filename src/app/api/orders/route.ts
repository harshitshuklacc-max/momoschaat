import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth";
import { checkoutSchema } from "@/lib/validations";
import {
  applyCoupon,
  createOrderWithItems,
  incrementCouponUsage,
  validateAndPriceItems,
} from "@/lib/orders";
import { getSetting } from "@/lib/settings";
import {
  checkRateLimit,
  errorResponse,
  getPaginationParams,
  parseZodError,
  rateLimited,
  successResponse,
  unauthorized,
} from "@/lib/api";
import type { Prisma } from "@prisma/client";

const orderCreateSchema = checkoutSchema.extend({
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.coerce.number().int().positive(),
        discount: z.coerce.number().min(0).default(0),
      })
    )
    .min(1),
});

export async function GET(request: Request) {
  const rl = checkRateLimit(request, "orders-list", 60, 60000);
  if (!rl.success) return rateLimited();

  const admin = await getAdminUser();
  if (!admin) return unauthorized();

  const { searchParams } = new URL(request.url);
  const { page, limit, skip } = getPaginationParams(searchParams);

  const where: Prisma.OrderWhereInput = {};

  const status = searchParams.get("status");
  if (status) where.status = status as Prisma.EnumOrderStatusFilter["equals"];

  const type = searchParams.get("type");
  if (type) where.type = type as Prisma.EnumOrderTypeFilter["equals"];

  const search = searchParams.get("search");
  if (search) {
    where.OR = [
      { orderNumber: { contains: search, mode: "insensitive" } },
      { customerName: { contains: search, mode: "insensitive" } },
      { customerPhone: { contains: search, mode: "insensitive" } },
    ];
  }

  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        items: true,
        payments: true,
        customer: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.count({ where }),
  ]);

  return successResponse({
    orders,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(request: Request) {
  const rl = checkRateLimit(request, "orders-create", 20, 60000);
  if (!rl.success) return rateLimited();

  const body = await request.json().catch(() => null);
  const parsed = orderCreateSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Validation failed", 400, parseZodError(parsed.error));
  }

  const data = parsed.data;

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

    const result = await createOrderWithItems({
      items: data.items,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerEmail: data.customerEmail,
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

    return successResponse(
      {
        order: result.order,
        invoice: result.invoice,
        summary: { subtotal, discount: orderDiscount, tax, grandTotal: result.order.grandTotal },
      },
      201
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create order";
    return errorResponse(message, 400);
  }
}
