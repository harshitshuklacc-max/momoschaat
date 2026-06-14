import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, requireCustomer } from "@/lib/auth";
import { checkoutSchema } from "@/lib/validations";
import { generateOrderNumber } from "@/lib/utils";
import { reserveStock } from "@/lib/inventory";
import { STORE } from "@/lib/constants";
import { decimalToNumber } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, ...checkoutData } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    const parsed = checkoutSchema.safeParse(checkoutData);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const authUser = await getAuthUser();
    let customerId: string | undefined;

    if (authUser?.customer) {
      customerId = authUser.customer.id;
    }

    const productIds = items.map((i: { productId: string }) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, status: "ACTIVE" },
      include: { inventory: true, images: true, barcode: true },
    });

    if (products.length !== items.length) {
      return NextResponse.json(
        { error: "Some products are unavailable" },
        { status: 400 }
      );
    }

    let subtotal = 0;
    const orderItems = items.map(
      (item: { productId: string; quantity: number }) => {
        const product = products.find((p) => p.id === item.productId)!;
        const available =
          (product.inventory?.quantity ?? 0) -
          (product.inventory?.reserved ?? 0);

        if (available < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name}`);
        }

        const price = decimalToNumber(product.sellingPrice);
        const total = price * item.quantity;
        subtotal += total;

        return {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          barcode: product.barcode?.value ?? null,
          quantity: item.quantity,
          price,
          discount: 0,
          total,
        };
      }
    );

    const shipping = subtotal >= 2000 ? 0 : 99;
    const discount = 0;
    const tax = 0;
    const grandTotal = subtotal - discount + tax + shipping;

    const order = await prisma.$transaction(async (tx) => {
      for (const item of items as { productId: string; quantity: number }[]) {
        await reserveStock(item.productId, item.quantity, tx);
      }

      const newOrder = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          customerId,
          customerName: parsed.data.customerName,
          customerPhone: parsed.data.customerPhone,
          customerEmail: parsed.data.customerEmail,
          type: "ONLINE",
          status: "PENDING",
          subtotal,
          discount,
          tax,
          shipping,
          grandTotal,
          paymentMethod: parsed.data.paymentMethod,
          shippingAddress: parsed.data.shippingAddress,
          notes: parsed.data.notes,
          items: { create: orderItems },
          payments: {
            create: {
              method: parsed.data.paymentMethod,
              amount: grandTotal,
              status:
                parsed.data.paymentMethod === "COD" ? "PENDING" : "PENDING",
            },
          },
        },
        include: { payments: true, items: true },
      });

      return newOrder;
    });

    return NextResponse.json({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        grandTotal: decimalToNumber(order.grandTotal),
        paymentMethod: order.paymentMethod,
        status: order.status,
        paymentId: order.payments[0]?.id,
      },
      upi: {
        id: STORE.upiId,
        amount: decimalToNumber(order.grandTotal),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Checkout failed";
    console.error("Checkout error:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
