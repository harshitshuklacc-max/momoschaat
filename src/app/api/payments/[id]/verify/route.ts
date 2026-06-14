import { prisma } from "@/lib/prisma";
import { withAdmin } from "@/lib/api-auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const verifySchema = z.object({
  action: z.enum(["verify", "reject"]),
  upiReference: z.string().optional(),
  rejectionReason: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAdmin(async (admin) => {
    const { id } = await params;
    const body = await request.json();
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message || "Invalid input");
    }

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { order: true, verification: true },
    });
    if (!payment) return jsonError("Payment not found", 404);

    const { action, upiReference, rejectionReason, notes } = parsed.data;
    const newStatus = action === "verify" ? "VERIFIED" : "REJECTED";

    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id },
        data: {
          status: action === "verify" ? "COMPLETED" : "REJECTED",
          transactionId: upiReference || payment.transactionId,
        },
      });

      if (payment.verification) {
        await tx.paymentVerification.update({
          where: { paymentId: id },
          data: {
            status: newStatus,
            upiReference,
            rejectionReason,
            notes,
            verifiedBy: admin.username,
            verifiedAt: new Date(),
          },
        });
      } else {
        await tx.paymentVerification.create({
          data: {
            paymentId: id,
            status: newStatus,
            upiReference,
            rejectionReason,
            notes,
            verifiedBy: admin.username,
            verifiedAt: new Date(),
          },
        });
      }

      if (action === "verify" && payment.order) {
        await tx.order.update({
          where: { id: payment.orderId },
          data: { status: "CONFIRMED" },
        });
      }
    });

    await createAuditLog({
      adminId: admin.id,
      action: "VERIFY_PAYMENT",
      entity: "payment",
      entityId: id,
      details: { action, upiReference },
    });

    return jsonOk({ message: action === "verify" ? "Payment verified" : "Payment rejected" });
  });
}
