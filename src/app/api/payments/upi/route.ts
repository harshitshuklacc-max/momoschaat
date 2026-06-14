import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { upiPaymentSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = upiPaymentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.findFirst({
      where: {
        orderId: parsed.data.orderId,
        method: "UPI",
      },
      include: { order: true },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: { status: "PENDING_VERIFICATION" },
      }),
      prisma.paymentVerification.upsert({
        where: { paymentId: payment.id },
        update: {
          upiReference: parsed.data.upiReference,
          screenshotUrl: parsed.data.screenshotUrl,
          status: "PENDING_VERIFICATION",
        },
        create: {
          paymentId: payment.id,
          upiReference: parsed.data.upiReference,
          screenshotUrl: parsed.data.screenshotUrl,
          status: "PENDING_VERIFICATION",
        },
      }),
      prisma.order.update({
        where: { id: parsed.data.orderId },
        data: { status: "CONFIRMED" },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message:
        "Payment submitted for verification. We will confirm your order shortly.",
    });
  } catch (error) {
    console.error("UPI payment error:", error);
    return NextResponse.json(
      { error: "Payment submission failed" },
      { status: 500 }
    );
  }
}
