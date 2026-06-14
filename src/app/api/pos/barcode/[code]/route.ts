import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth";
import {
  checkRateLimit,
  errorResponse,
  notFound,
  rateLimited,
  successResponse,
  unauthorized,
} from "@/lib/api";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const rl = checkRateLimit(request, "pos-barcode", 200, 60000);
  if (!rl.success) return rateLimited();

  const admin = await getAdminUser();
  if (!admin) return unauthorized();

  const { code } = await params;
  const decoded = decodeURIComponent(code);

  const barcode = await prisma.barcode.findFirst({
    where: {
      OR: [{ value: decoded }, { value: { contains: decoded, mode: "insensitive" } }],
    },
    include: {
      product: {
        include: {
          inventory: true,
          images: { where: { isPrimary: true }, take: 1 },
          brand: { select: { name: true } },
        },
      },
    },
  });

  if (!barcode || !barcode.product) {
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ sku: decoded }, { sku: { contains: decoded, mode: "insensitive" } }],
        status: "ACTIVE",
      },
      include: {
        inventory: true,
        images: { where: { isPrimary: true }, take: 1 },
        brand: { select: { name: true } },
        barcode: true,
      },
    });

    if (!product) return notFound("Product not found for barcode");

    return successResponse({
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
        sellingPrice: product.sellingPrice,
        mrp: product.mrp,
        barcode: product.barcode?.value,
        brand: product.brand.name,
        stock: product.inventory
          ? product.inventory.quantity - product.inventory.reserved
          : 0,
        image: product.images[0]?.url ?? null,
      },
    });
  }

  const product = barcode.product;
  if (product.status !== "ACTIVE") {
    return errorResponse("Product is not active", 400);
  }

  return successResponse({
    product: {
      id: product.id,
      name: product.name,
      sku: product.sku,
      sellingPrice: product.sellingPrice,
      mrp: product.mrp,
      barcode: barcode.value,
      brand: product.brand.name,
      stock: product.inventory
        ? product.inventory.quantity - product.inventory.reserved
        : 0,
      image: product.images[0]?.url ?? null,
    },
  });
}
