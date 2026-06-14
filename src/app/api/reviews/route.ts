import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { reviewSchema } from "@/lib/validations";
import {
  checkRateLimit,
  errorResponse,
  getPaginationParams,
  parseZodError,
  rateLimited,
  successResponse,
  unauthorized,
} from "@/lib/api";
import type { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  const rl = checkRateLimit(request, "reviews-list", 120, 60000);
  if (!rl.success) return rateLimited();

  const { searchParams } = new URL(request.url);
  const { page, limit, skip } = getPaginationParams(searchParams);

  const where: Prisma.ReviewWhereInput = {};

  const productId = searchParams.get("productId");
  if (productId) where.productId = productId;

  const status = searchParams.get("status");
  if (status) {
    where.status = status as Prisma.EnumReviewStatusFilter["equals"];
  } else {
    where.status = "APPROVED";
  }

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      include: {
        customer: {
          select: { firstName: true, lastName: true, avatar: true },
        },
        product: { select: { id: true, name: true, slug: true } },
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.review.count({ where }),
  ]);

  const avgRating = await prisma.review.aggregate({
    where: productId ? { productId, status: "APPROVED" } : { status: "APPROVED" },
    _avg: { rating: true },
    _count: true,
  });

  return successResponse({
    reviews,
    stats: {
      averageRating: avgRating._avg.rating
        ? Math.round(avgRating._avg.rating * 10) / 10
        : 0,
      totalReviews: avgRating._count,
    },
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(request: Request) {
  const rl = checkRateLimit(request, "reviews-create", 20, 60000);
  if (!rl.success) return rateLimited();

  const user = await getAuthUser();
  if (!user?.customer) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Validation failed", 400, parseZodError(parsed.error));
  }

  const product = await prisma.product.findUnique({
    where: { id: parsed.data.productId },
  });
  if (!product) return errorResponse("Product not found", 404);

  const existing = await prisma.review.findFirst({
    where: {
      productId: parsed.data.productId,
      customerId: user.customer.id,
    },
  });
  if (existing) {
    return errorResponse("You have already reviewed this product", 409);
  }

  let isVerified = false;
  if (parsed.data.orderId) {
    const order = await prisma.order.findFirst({
      where: {
        id: parsed.data.orderId,
        customerId: user.customer.id,
        status: "DELIVERED",
        items: { some: { productId: parsed.data.productId } },
      },
    });
    isVerified = !!order;
  }

  const review = await prisma.review.create({
    data: {
      productId: parsed.data.productId,
      customerId: user.customer.id,
      orderId: parsed.data.orderId,
      rating: parsed.data.rating,
      title: parsed.data.title,
      comment: parsed.data.comment,
      isVerified,
      status: "PENDING",
    },
    include: {
      customer: { select: { firstName: true, lastName: true } },
    },
  });

  return successResponse(review, 201);
}
