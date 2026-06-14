import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth";
import { upiPaymentSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";
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

const verifySchema = upiPaymentSchema.extend({
  action: z.enum(["approve", "reject"]),
  rejectionReason: z.string().optional(),
});

export async function POST(request: Request) {
  const rl = checkRateLimit(request, "payments-verify", 30, 60000);
  if (!rl.success) return rateLimited();

  const admin = await getAdminUser();
  if (!admin) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Validation failed", 400, parseZodError(parsed.error));
  }

  const { orderId, upiReference, screenshotUrl, action, rejectionReason } =
    parsed.data;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      payments: { include: { verification: true } },
    },
  });

  if (!order) return notFound("Order not found");

  const payment = order.payments.find((p) => p.method === "UPI");
  if (!payment) return errorResponse("No UPI payment found for this order", 400);

  try {
    const result = await prisma.$transaction(async (tx) => {
      if (action === "approve") {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: "VERIFIED", transactionId: upiReference },
        });

        await tx.paymentVerification.upsert({
          where: { paymentId: payment.id },
          update: {
            upiReference,
            screenshotUrl,
            status: "VERIFIED",
            verifiedBy: admin.id,
            verifiedAt: new Date(),
          },
          create: {
            paymentId: payment.id,
            upiReference,
            screenshotUrl,
            status: "VERIFIED",
            verifiedBy: admin.id,
            verifiedAt: new Date(),
          },
        });

        await tx.order.update({
          where: { id: orderId },
          data: { status: "CONFIRMED" },
        });
      } else {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: "REJECTED" },
        });

        await tx.paymentVerification.upsert({
          where: { paymentId: payment.id },
          update: {
            upiReference,
            screenshotUrl,
            status: "REJECTED",
            verifiedBy: admin.id,
            verifiedAt: new Date(),
            rejectionReason,
          },
          create: {
            paymentId: payment.id,
            upiReference,
            screenshotUrl,
            status: "REJECTED",
            verifiedBy: admin.id,
            verifiedAt: new Date(),
            rejectionReason,
          },
        });
      }

      return tx.payment.findUnique({
        where: { id: payment.id },
        include: { verification: true, order: true },
      });
    });

    const meta = getRequestMeta(request);
    await createAuditLog({
      adminId: admin.id,
      action: "VERIFY_PAYMENT",
      entity: "payment",
      entityId: payment.id,
      details: { orderId, action, upiReference },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return successResponse(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Verification failed";
    return errorResponse(message, 500);
  }
}
