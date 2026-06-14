import { prisma } from "./prisma";
import { updateInventory } from "./inventory";
import { createInvoice } from "./invoice";
import { generateOrderNumber, decimalToNumber } from "./utils";
import type {
  OrderType,
  PaymentMethod,
  PaymentStatus,
  Prisma,
} from "@prisma/client";

export interface OrderItemInput {
  productId: string;
  quantity: number;
  discount?: number;
}

export interface CreateOrderParams {
  items: OrderItemInput[];
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  type: OrderType;
  paymentMethod: PaymentMethod;
  shippingAddress?: Prisma.InputJsonValue;
  notes?: string;
  orderDiscount?: number;
  shipping?: number;
  tax?: number;
  createInvoice?: boolean;
}

export async function validateAndPriceItems(items: OrderItemInput[]) {
  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, status: "ACTIVE" },
    include: { inventory: true, barcode: true },
  });

  if (products.length !== productIds.length) {
    throw new Error("One or more products not found or inactive");
  }

  const productMap = new Map(products.map((p) => [p.id, p]));
  const lineItems: Array<{
    productId: string;
    name: string;
    sku: string;
    barcode: string | null;
    quantity: number;
    price: number;
    discount: number;
    total: number;
    availableStock: number;
  }> = [];

  let subtotal = 0;

  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) throw new Error("Product not found");

    const available = product.inventory
      ? product.inventory.quantity - product.inventory.reserved
      : 0;

    if (available < item.quantity) {
      throw new Error(`Insufficient stock for ${product.name}`);
    }

    const price = decimalToNumber(product.sellingPrice);
    const discount = item.discount || 0;
    const total = price * item.quantity - discount;
    subtotal += total;

    lineItems.push({
      productId: product.id,
      name: product.name,
      sku: product.sku,
      barcode: product.barcode?.value ?? null,
      quantity: item.quantity,
      price,
      discount,
      total,
      availableStock: available,
    });
  }

  return { lineItems, subtotal, products };
}

export async function createOrderWithItems(params: CreateOrderParams) {
  const { lineItems, subtotal } = await validateAndPriceItems(params.items);

  const discount = params.orderDiscount || 0;
  const tax = params.tax || 0;
  const shipping = params.shipping || 0;
  const grandTotal = Math.max(0, subtotal - discount + tax + shipping);
  const orderNumber = generateOrderNumber();

  const paymentStatus: PaymentStatus =
    params.paymentMethod === "UPI"
      ? "PENDING_VERIFICATION"
      : params.paymentMethod === "COD"
        ? "PENDING"
        : "COMPLETED";

  const orderStatus =
    params.type === "OFFLINE" ? "CONFIRMED" : "PENDING";

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        orderNumber,
        customerId: params.customerId,
        customerName: params.customerName,
        customerPhone: params.customerPhone,
        customerEmail: params.customerEmail,
        type: params.type,
        status: orderStatus,
        subtotal,
        discount,
        tax,
        shipping,
        grandTotal,
        paymentMethod: params.paymentMethod,
        shippingAddress: params.shippingAddress,
        notes: params.notes,
        items: {
          create: lineItems.map((item) => ({
            productId: item.productId,
            name: item.name,
            sku: item.sku,
            barcode: item.barcode,
            quantity: item.quantity,
            price: item.price,
            discount: item.discount,
            total: item.total,
          })),
        },
        payments: {
          create: {
            method: params.paymentMethod,
            amount: grandTotal,
            status: paymentStatus,
          },
        },
      },
      include: {
        items: true,
        payments: true,
      },
    });

    const inventoryAction =
      params.type === "OFFLINE" ? "POS_SALE" : "ONLINE_ORDER";

    for (const item of lineItems) {
      await updateInventory(
        item.productId,
        -item.quantity,
        inventoryAction,
        orderNumber,
        undefined,
        tx
      );
    }

    if (params.paymentMethod === "UPI") {
      const payment = created.payments[0];
      await tx.paymentVerification.create({
        data: {
          paymentId: payment.id,
          status: "PENDING_VERIFICATION",
        },
      });
    }

    return created;
  });

  let invoice = null;
  if (params.createInvoice !== false) {
    invoice = await createInvoice({
      orderId: order.id,
      customerName: params.customerName,
      customerPhone: params.customerPhone,
      items: lineItems.map((item) => ({
        productId: item.productId,
        name: item.name,
        sku: item.sku,
        barcode: item.barcode ?? undefined,
        quantity: item.quantity,
        price: item.price,
        discount: item.discount,
      })),
      subtotal,
      discount,
      tax,
      grandTotal,
      paymentMethod: params.paymentMethod,
    });
  }

  return { order, invoice };
}

export async function applyCoupon(
  code: string,
  subtotal: number
): Promise<{ discount: number; couponId: string }> {
  const coupon = await prisma.coupon.findUnique({
    where: { code: code.toUpperCase() },
  });

  if (!coupon || !coupon.isActive) {
    throw new Error("Invalid coupon code");
  }

  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) {
    throw new Error("Coupon is not yet active");
  }
  if (coupon.expiresAt && coupon.expiresAt < now) {
    throw new Error("Coupon has expired");
  }
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    throw new Error("Coupon usage limit reached");
  }
  if (coupon.minOrderValue && subtotal < decimalToNumber(coupon.minOrderValue)) {
    throw new Error(
      `Minimum order value of ₹${decimalToNumber(coupon.minOrderValue)} required`
    );
  }

  let discount = 0;
  if (coupon.discountType === "percentage") {
    discount = (subtotal * decimalToNumber(coupon.discountValue)) / 100;
    if (coupon.maxDiscount) {
      discount = Math.min(discount, decimalToNumber(coupon.maxDiscount));
    }
  } else {
    discount = decimalToNumber(coupon.discountValue);
  }

  discount = Math.min(discount, subtotal);

  return { discount, couponId: coupon.id };
}

export async function incrementCouponUsage(couponId: string) {
  await prisma.coupon.update({
    where: { id: couponId },
    data: { usedCount: { increment: 1 } },
  });
}
