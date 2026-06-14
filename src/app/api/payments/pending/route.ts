import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth";
import {
  checkRateLimit,
  getPaginationParams,
  rateLimited,
  successResponse,
  unauthorized,
} from "@/lib/api";

export async function GET(request: Request) {
  const rl = checkRateLimit(request, "payments-pending", 60, 60000);
  if (!rl.success) return rateLimited();

  const admin = await getAdminUser();
  if (!admin) return unauthorized();

  const { searchParams } = new URL(request.url);
  const { page, limit, skip } = getPaginationParams(searchParams);

  const where = {
    status: "PENDING_VERIFICATION" as const,
    method: "UPI" as const,
  };

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        verification: true,
        order: {
          select: {
            id: true,
            orderNumber: true,
            customerName: true,
            customerPhone: true,
            grandTotal: true,
            status: true,
            createdAt: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.payment.count({ where }),
  ]);

  return successResponse({
    payments,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
