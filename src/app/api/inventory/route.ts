import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth";
import { inventoryAdjustSchema } from "@/lib/validations";
import { updateInventory, getInventoryStats } from "@/lib/inventory";
import { createAuditLog } from "@/lib/audit";
import {
  checkRateLimit,
  errorResponse,
  getPaginationParams,
  getRequestMeta,
  parseZodError,
  rateLimited,
  successResponse,
  unauthorized,
} from "@/lib/api";
export async function GET(request: Request) {
  const rl = checkRateLimit(request, "inventory-list", 60, 60000);
  if (!rl.success) return rateLimited();

  const admin = await getAdminUser();
  if (!admin) return unauthorized();

  const { searchParams } = new URL(request.url);
  const { page, limit, skip } = getPaginationParams(searchParams);

  const lowStock = searchParams.get("lowStock") === "true";
  const outOfStock = searchParams.get("outOfStock") === "true";
  const search = searchParams.get("search");

  const productFilter = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { sku: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : undefined;

  const [allInventories, stats] = await Promise.all([
    prisma.inventory.findMany({
      where: {
        ...(outOfStock ? { quantity: 0 } : {}),
        ...(productFilter ? { product: productFilter } : {}),
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            status: true,
            images: { where: { isPrimary: true }, take: 1 },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    getInventoryStats(),
  ]);

  const filtered = lowStock
    ? allInventories.filter((i) => i.quantity > 0 && i.quantity <= i.minStock)
    : allInventories;

  const total = filtered.length;
  const paginated = filtered.slice(skip, skip + limit);

  return successResponse({
    inventory: paginated,
    stats,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function PATCH(request: Request) {
  const rl = checkRateLimit(request, "inventory-adjust", 30, 60000);
  if (!rl.success) return rateLimited();

  const admin = await getAdminUser();
  if (!admin) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = inventoryAdjustSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Validation failed", 400, parseZodError(parsed.error));
  }

  const { productId, quantity, notes } = parsed.data;

  const inventory = await prisma.inventory.findUnique({
    where: { productId },
    include: { product: { select: { name: true } } },
  });
  if (!inventory) return errorResponse("Inventory not found", 404);

  try {
    const updated = await updateInventory(
      productId,
      quantity,
      "ADJUSTMENT",
      undefined,
      notes || `Manual adjustment by admin`
    );

    const meta = getRequestMeta(request);
    await createAuditLog({
      adminId: admin.id,
      action: "UPDATE",
      entity: "inventory",
      entityId: inventory.id,
      details: { productId, quantityChange: quantity, newQty: updated.quantity },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return successResponse(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Adjustment failed";
    return errorResponse(message, 400);
  }
}
