import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import {
  checkRateLimit,
  errorResponse,
  notFound,
  parseZodError,
  rateLimited,
  successResponse,
  unauthorized,
} from "@/lib/api";

const wishlistSchema = z.object({
  productId: z.string().min(1),
});

export async function GET(request: Request) {
  const rl = checkRateLimit(request, "wishlist-list", 60, 60000);
  if (!rl.success) return rateLimited();

  const user = await getAuthUser();
  if (!user?.customer) return unauthorized();

  const wishlists = await prisma.wishlist.findMany({
    where: { customerId: user.customer.id },
    include: {
      product: {
        include: {
          images: { where: { isPrimary: true }, take: 1 },
          brand: { select: { name: true } },
          inventory: { select: { quantity: true, reserved: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return successResponse({ wishlist: wishlists });
}

export async function POST(request: Request) {
  const rl = checkRateLimit(request, "wishlist-add", 30, 60000);
  if (!rl.success) return rateLimited();

  const user = await getAuthUser();
  if (!user?.customer) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = wishlistSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Validation failed", 400, parseZodError(parsed.error));
  }

  const product = await prisma.product.findUnique({
    where: { id: parsed.data.productId, status: "ACTIVE" },
  });
  if (!product) return notFound("Product not found");

  const existing = await prisma.wishlist.findUnique({
    where: {
      customerId_productId: {
        customerId: user.customer.id,
        productId: parsed.data.productId,
      },
    },
  });
  if (existing) {
    return successResponse(existing);
  }

  const item = await prisma.wishlist.create({
    data: {
      customerId: user.customer.id,
      productId: parsed.data.productId,
    },
    include: {
      product: {
        include: {
          images: { where: { isPrimary: true }, take: 1 },
        },
      },
    },
  });

  return successResponse(item, 201);
}

export async function DELETE(request: Request) {
  const rl = checkRateLimit(request, "wishlist-remove", 30, 60000);
  if (!rl.success) return rateLimited();

  const user = await getAuthUser();
  if (!user?.customer) return unauthorized();

  const { searchParams } = new URL(request.url);
  let productId = searchParams.get("productId");

  if (!productId) {
    const body = await request.json().catch(() => null);
    const parsed = wishlistSchema.safeParse(body);
    if (parsed.success) productId = parsed.data.productId;
  }

  if (!productId) {
    return errorResponse("productId is required", 400);
  }

  const item = await prisma.wishlist.findUnique({
    where: {
      customerId_productId: {
        customerId: user.customer.id,
        productId,
      },
    },
  });
  if (!item) return notFound("Wishlist item not found");

  await prisma.wishlist.delete({ where: { id: item.id } });
  return successResponse({ message: "Removed from wishlist" });
}
