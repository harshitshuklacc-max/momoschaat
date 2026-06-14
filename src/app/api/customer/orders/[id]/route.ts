import { NextResponse } from "next/server";
import { requireCustomer } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/utils";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { customer } = await requireCustomer();
    const { id } = await params;

    const order = await prisma.order.findFirst({
      where: { id, customerId: customer.id },
      include: {
        items: {
          include: {
            product: {
              include: { images: { where: { isPrimary: true }, take: 1 } },
            },
          },
        },
        payments: { include: { verification: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const payment = order.payments[0];

    return NextResponse.json({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        subtotal: decimalToNumber(order.subtotal),
        discount: decimalToNumber(order.discount),
        tax: decimalToNumber(order.tax),
        shipping: decimalToNumber(order.shipping),
        grandTotal: decimalToNumber(order.grandTotal),
        paymentMethod: order.paymentMethod,
        shippingAddress: order.shippingAddress,
        notes: order.notes,
        createdAt: order.createdAt.toISOString(),
        items: order.items.map((item) => ({
          id: item.id,
          name: item.name,
          sku: item.sku,
          quantity: item.quantity,
          price: decimalToNumber(item.price),
          total: decimalToNumber(item.total),
          image:
            item.product?.images[0]?.url ?? null,
        })),
        payment: payment
          ? {
              status: payment.status,
              method: payment.method,
              verification: payment.verification
                ? {
                    upiReference: payment.verification.upiReference,
                    screenshotUrl: payment.verification.screenshotUrl,
                    status: payment.verification.status,
                  }
                : undefined,
            }
          : null,
      },
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
