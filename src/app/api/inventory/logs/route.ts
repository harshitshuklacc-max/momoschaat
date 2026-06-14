import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth";
import {
  checkRateLimit,
  getPaginationParams,
  rateLimited,
  successResponse,
  unauthorized,
} from "@/lib/api";
import type { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  const rl = checkRateLimit(request, "inventory-logs", 60, 60000);
  if (!rl.success) return rateLimited();

  const admin = await getAdminUser();
  if (!admin) return unauthorized();

  const { searchParams } = new URL(request.url);
  const { page, limit, skip } = getPaginationParams(searchParams);

  const where: Prisma.InventoryLogWhereInput = {};

  const action = searchParams.get("action");
  if (action) {
    where.action = action as Prisma.EnumInventoryActionFilter["equals"];
  }

  const productId = searchParams.get("productId");
  if (productId) {
    where.inventory = { productId };
  }

  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }

  const [logs, total] = await Promise.all([
    prisma.inventoryLog.findMany({
      where,
      include: {
        inventory: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
          },
        },
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.inventoryLog.count({ where }),
  ]);

  return successResponse({
    logs,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
