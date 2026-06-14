import type { Prisma } from "@prisma/client";
import { decimalToNumber } from "./utils";
import type {
  ProductCardData,
  ProductDetailData,
  ReviewData,
  CategoryData,
  BrandData,
} from "./types";

export const productInclude = {
  brand: { select: { id: true, name: true, slug: true, logo: true } },
  category: { select: { id: true, name: true, slug: true } },
  images: { orderBy: { sortOrder: "asc" as const } },
  inventory: { select: { quantity: true, reserved: true } },
  reviews: {
    where: { status: "APPROVED" as const },
    select: { rating: true },
  },
} satisfies Prisma.ProductInclude;

type ProductWithRelations = Prisma.ProductGetPayload<{
  include: typeof productInclude;
}>;

export function serializeProduct(product: ProductWithRelations): ProductCardData {
  const primaryImage =
    product.images.find((i) => i.isPrimary) || product.images[0];
  const ratings = product.reviews.map((r) => r.rating);
  const avgRating =
    ratings.length > 0
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      : undefined;

  const available =
    (product.inventory?.quantity ?? 0) - (product.inventory?.reserved ?? 0);

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    mrp: decimalToNumber(product.mrp),
    sellingPrice: decimalToNumber(product.sellingPrice),
    discount: decimalToNumber(product.discount),
    image: primaryImage?.url ?? null,
    brand: product.brand,
    category: product.category,
    color: product.color,
    size: product.size,
    gender: product.gender,
    inStock: available > 0,
    rating: avgRating,
    reviewCount: ratings.length || undefined,
  };
}

export function serializeProductDetail(
  product: ProductWithRelations
): ProductDetailData {
  const base = serializeProduct(product);
  const available =
    (product.inventory?.quantity ?? 0) - (product.inventory?.reserved ?? 0);

  return {
    ...base,
    description: product.description,
    sku: product.sku,
    images: product.images.map((i) => ({
      url: i.url,
      alt: i.alt,
      isPrimary: i.isPrimary,
    })),
    isFeatured: product.isFeatured,
    isTrending: product.isTrending,
    isNewArrival: product.isNewArrival,
    isBestSeller: product.isBestSeller,
    stock: available,
  };
}

export function serializeReview(
  review: Prisma.ReviewGetPayload<{
    include: { customer: { select: { firstName: true; lastName: true } } };
  }>
): ReviewData {
  return {
    id: review.id,
    rating: review.rating,
    title: review.title,
    comment: review.comment,
    isVerified: review.isVerified,
    createdAt: review.createdAt.toISOString(),
    customer: {
      firstName: review.customer.firstName,
      lastName: review.customer.lastName,
    },
  };
}

type CategoryWithCount = Prisma.CategoryGetPayload<{
  include: { _count: { select: { products: true } } };
}>;

type BrandWithCount = Prisma.BrandGetPayload<{
  include: { _count: { select: { products: true } } };
}>;

type CategoryBase = Prisma.CategoryGetPayload<Record<string, never>>;
type BrandBase = Prisma.BrandGetPayload<Record<string, never>>;

export function serializeCategory(
  category: CategoryWithCount | CategoryBase
): CategoryData {
  const productCount =
    "_count" in category
      ? (category as CategoryWithCount)._count.products
      : undefined;

  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    image: category.image,
    productCount,
  };
}

export function serializeBrand(
  brand: BrandWithCount | BrandBase
): BrandData {
  const productCount =
    "_count" in brand ? (brand as BrandWithCount)._count.products : undefined;

  return {
    id: brand.id,
    name: brand.name,
    slug: brand.slug,
    description: brand.description,
    logo: brand.logo,
    productCount,
  };
}
