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
            { value: { contains: search, mode: "insensitive" as const } },
            { product: { name: { contains: search, mode: "insensitive" as const } } },
            { product: { sku: { contains: search, mode: "insensitive" as const } } },
          ],
        }
      : {};

    const [barcodes, total] = await Promise.all([
      prisma.barcode.findMany({
        where,
        include: {
          product: {
            select: { id: true, name: true, sku: true, sellingPrice: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.barcode.count({ where }),
    ]);

    return jsonOk({
      barcodes,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  });
}
