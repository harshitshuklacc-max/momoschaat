import { prisma } from "@/lib/prisma";
import {
  productInclude,
  serializeProductDetail,
  serializeReview,
} from "@/lib/serializers";
import {
  checkRateLimit,
  notFound,
  rateLimited,
  successResponse,
  errorResponse,
} from "@/lib/api";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const rl = checkRateLimit(request, "products-slug", 120, 60000);
  if (!rl.success) return rateLimited();

  try {
    const { slug } = await params;

    const product = await prisma.product.findUnique({
      where: { slug, status: "ACTIVE" },
      include: {
        ...productInclude,
        reviews: {
          where: { status: "APPROVED" },
          include: {
            customer: { select: { firstName: true, lastName: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!product) return notFound("Product not found");

    const related = await prisma.product.findMany({
      where: {
        status: "ACTIVE",
        categoryId: product.categoryId,
        id: { not: product.id },
      },
      include: productInclude,
      take: 4,
      orderBy: { createdAt: "desc" },
    });

    return successResponse({
      product: serializeProductDetail(product),
      reviews: product.reviews.map(serializeReview),
      related: related.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        sellingPrice: Number(p.sellingPrice),
        image: p.images.find((i) => i.isPrimary)?.url ?? p.images[0]?.url ?? null,
      })),
    });
  } catch (error) {
    console.error("Product slug API error:", error);
    return errorResponse("Failed to load product", 500);
  }
}
