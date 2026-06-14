import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth";
import { productSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";
import { calculateDiscount } from "@/lib/utils";
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
const productInclude = {
  brand: { select: { id: true, name: true, slug: true } },
  category: { select: { id: true, name: true, slug: true } },
  images: { orderBy: { sortOrder: "asc" as const } },
  inventory: true,
  barcode: true,
  reviews: {
    where: { status: "APPROVED" as const },
    select: { rating: true },
  },
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = checkRateLimit(request, "products-detail", 120, 60000);
  if (!rl.success) return rateLimited();

  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: productInclude,
  });

  if (!product) return notFound("Product not found");

  const avgRating =
    product.reviews.length > 0
      ? product.reviews.reduce((sum, r) => sum + r.rating, 0) /
        product.reviews.length
      : 0;

  const { reviews: _reviews, ...rest } = product;

  return successResponse({ ...rest, avgRating: Math.round(avgRating * 10) / 10 });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = checkRateLimit(request, "products-update", 30, 60000);
  if (!rl.success) return rateLimited();

  const admin = await getAdminUser();
  if (!admin) return unauthorized();

  const { id } = await params;
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return notFound("Product not found");

  const body = await request.json().catch(() => null);
  const parsed = productSchema.partial().safeParse(body);
  if (!parsed.success) {
    return errorResponse("Validation failed", 400, parseZodError(parsed.error));
  }

  const data = parsed.data;
  const updateData: Record<string, unknown> = { ...data };

  if (data.mrp !== undefined && data.sellingPrice !== undefined) {
    updateData.discount = calculateDiscount(data.mrp, data.sellingPrice);
  } else if (data.mrp !== undefined) {
    updateData.discount = calculateDiscount(
      data.mrp,
      Number(existing.sellingPrice)
    );
  } else if (data.sellingPrice !== undefined) {
    updateData.discount = calculateDiscount(
      Number(existing.mrp),
      data.sellingPrice
    );
  }

  delete updateData.stock;
  delete updateData.images;
  delete updateData.barcode;
  delete updateData.sku;

  try {
    const product = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id },
        data: updateData,
        include: productInclude,
      });

      if (data.stock !== undefined) {
        await tx.inventory.upsert({
          where: { productId: id },
          update: { quantity: data.stock },
          create: { productId: id, quantity: data.stock },
        });
      }

      if (data.images) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        if (data.images.length > 0) {
          await tx.productImage.createMany({
            data: data.images.map((url, index) => ({
              productId: id,
              url,
              sortOrder: index,
              isPrimary: index === 0,
            })),
          });
        }
      }

      return tx.product.findUnique({
        where: { id },
        include: productInclude,
      });
    });

    const meta = getRequestMeta(request);
    await createAuditLog({
      adminId: admin.id,
      action: "UPDATE",
      entity: "product",
      entityId: id,
      details: data,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return successResponse(product);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update product";
    return errorResponse(message, 500);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = checkRateLimit(request, "products-delete", 20, 60000);
  if (!rl.success) return rateLimited();

  const admin = await getAdminUser();
  if (!admin) return unauthorized();

  const { id } = await params;
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return notFound("Product not found");

  await prisma.product.delete({ where: { id } });

  const meta = getRequestMeta(request);
  await createAuditLog({
    adminId: admin.id,
    action: "DELETE",
    entity: "product",
    entityId: id,
    details: { name: existing.name, sku: existing.sku },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return successResponse({ message: "Product deleted" });
}
