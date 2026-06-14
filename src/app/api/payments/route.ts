import { prisma } from "@/lib/prisma";
import { withAdmin } from "@/lib/api-auth";
import { jsonOk } from "@/lib/api-response";
import { decimalToNumber } from "@/lib/utils";
import { PAGINATION } from "@/lib/constants";

export async function GET(request: Request) {
  return withAdmin(async () => {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      PAGINATION.maxLimit,
      parseInt(searchParams.get("limit") || String(PAGINATION.defaultLimit), 10)
    );
    const status = searchParams.get("status") || "PENDING_VERIFICATION";

    const where = status === "all" ? {} : { status: status as "PENDING_VERIFICATION" | "COMPLETED" | "REJECTED" };

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              customerName: true,
              customerPhone: true,
              grandTotal: true,
            },
          },
          verification: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    return jsonOk({
      payments: payments.map((p) => ({
        ...p,
        amount: decimalToNumber(p.amount),
        order: p.order
          ? { ...p.order, grandTotal: decimalToNumber(p.order.grandTotal) }
          : null,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  });
}
