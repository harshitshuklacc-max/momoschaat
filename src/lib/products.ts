import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { productInclude, serializeProduct } from "./serializers";
import { PAGINATION } from "./constants";

export interface ProductQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  brand?: string;
  category?: string;
  gender?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
  featured?: boolean;
  trending?: boolean;
  newArrival?: boolean;
  bestSeller?: boolean;
}

export function buildProductWhere(
  params: ProductQueryParams
): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { status: "ACTIVE" };

  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      { sku: { contains: params.search, mode: "insensitive" } },
      { brand: { name: { contains: params.search, mode: "insensitive" } } },
    ];
  }

  if (params.brand) {
    where.brand = { slug: params.brand };
  }

  if (params.category) {
    where.category = { slug: params.category };
  }

  if (params.gender) {
    where.gender = params.gender as Prisma.EnumGenderFilter["equals"];
  }

  if (params.minPrice !== undefined || params.maxPrice !== undefined) {
    where.sellingPrice = {};
    if (params.minPrice !== undefined) {
      where.sellingPrice.gte = params.minPrice;
    }
    if (params.maxPrice !== undefined) {
      where.sellingPrice.lte = params.maxPrice;
    }
  }

  if (params.featured) where.isFeatured = true;
  if (params.trending) where.isTrending = true;
  if (params.newArrival) where.isNewArrival = true;
  if (params.bestSeller) where.isBestSeller = true;

  return where;
}

export function buildProductOrderBy(
  sort?: string
): Prisma.ProductOrderByWithRelationInput | Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "price-asc":
      return { sellingPrice: "asc" };
    case "price-desc":
      return { sellingPrice: "desc" };
    case "name":
      return { name: "asc" };
    case "newest":
      return { createdAt: "desc" };
    case "discount":
      return { discount: "desc" };
    default:
      return { createdAt: "desc" };
  }
}

export async function queryProducts(params: ProductQueryParams) {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(
    PAGINATION.maxLimit,
    Math.max(1, params.limit ?? PAGINATION.defaultLimit)
  );
  const where = buildProductWhere(params);

  const [products, total, brands, categories, priceAgg] = await Promise.all([
    prisma.product.findMany({
      where,
      include: productInclude,
      orderBy: buildProductOrderBy(params.sort),
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where }),
    prisma.brand.findMany({
      where: { isActive: true, products: { some: { status: "ACTIVE" } } },
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({
      where: { isActive: true, products: { some: { status: "ACTIVE" } } },
      select: { id: true, name: true, slug: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.product.aggregate({
      where: { status: "ACTIVE" },
      _min: { sellingPrice: true },
      _max: { sellingPrice: true },
    }),
  ]);

  return {
    products: products.map(serializeProduct),
    total,
    page,
    limit,
    filters: {
      brands,
      categories,
      genders: ["MEN", "WOMEN", "UNISEX", "KIDS"],
      priceRange: {
        min: priceAgg._min.sellingPrice
          ? Number(priceAgg._min.sellingPrice)
          : 0,
        max: priceAgg._max.sellingPrice
          ? Number(priceAgg._max.sellingPrice)
          : 10000,
      },
    },
  };
}
