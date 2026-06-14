import { prisma } from "@/lib/prisma";
import { withAdmin } from "@/lib/api-auth";
import { jsonOk } from "@/lib/api-response";
import { PAGINATION } from "@/lib/constants";

export async function GET(request: Request) {
  return withAdmin(async () => {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      PAGINATION.maxLimit,
      parseInt(searchParams.get("limit") || String(PAGINATION.defaultLimit), 10)
    );
    const search = searchParams.get("search") || "";

    const where = search
      ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" as const } },
            { lastName: { contains: search, mode: "insensitive" as const } },
            { phone: { contains: search } },
            { user: { email: { contains: search, mode: "insensitive" as const } } },
          ],
        }
      : {};

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          user: { select: { email: true, isActive: true, createdAt: true } },
          _count: { select: { orders: true, reviews: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.customer.count({ where }),
    ]);

    return jsonOk({
      customers,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  });
}
