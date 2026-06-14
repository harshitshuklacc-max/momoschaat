import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth";
import {
  checkRateLimit,
  errorResponse,
  rateLimited,
  successResponse,
} from "@/lib/api";

export async function GET(request: Request) {
  const rl = checkRateLimit(request, "products-search", 200, 60000);
  if (!rl.success) return rateLimited();

  const admin = await getAdminUser();
  if (!admin) {
    return errorResponse("Admin authentication required for POS search", 401);
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));

  if (!q || q.length < 1) {
    return errorResponse("Search query required", 400);
  }

  const products = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { sku: { contains: q, mode: "insensitive" } },
        { barcode: { value: { contains: q, mode: "insensitive" } } },
      ],
    },
    include: {
      inventory: { select: { quantity: true, reserved: true } },
      barcode: { select: { value: true, type: true } },
      images: {
        where: { isPrimary: true },
        take: 1,
        select: { url: true },
      },
    },
    take: limit,
    orderBy: { name: "asc" },
  });

  const results = products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    sellingPrice: p.sellingPrice,
    mrp: p.mrp,
    barcode: p.barcode?.value,
    stock: p.inventory
      ? p.inventory.quantity - p.inventory.reserved
      : 0,
    image: p.images[0]?.url ?? null,
  }));

  return successResponse({ products: results });
}
