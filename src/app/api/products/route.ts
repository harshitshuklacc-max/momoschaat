import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth";
import { productSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";
import { generateBarcodeValue } from "@/lib/barcode";
import {
  calculateDiscount,
  generateSKU,
  slugify,
} from "@/lib/utils";
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
import type { Prisma } from "@prisma/client";

const productInclude = {
  brand: { select: { id: true, name: true, slug: true } },
  category: { select: { id: true, name: true, slug: true } },
  images: { orderBy: { sortOrder: "asc" as const } },
  inventory: true,
  barcode: true,
};

export async function GET(request: Request) {
  const rl = checkRateLimit(request, "products-list", 120, 60000);
  if (!rl.success) return rateLimited();

  const { searchParams } = new URL(request.url);
  const { page, limit, skip } = getPaginationParams(searchParams);

  const where: Prisma.ProductWhereInput = {};

  const search = searchParams.get("search");
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const brandId = searchParams.get("brandId");
  if (brandId) where.brandId = brandId;

  const categoryId = searchParams.get("categoryId");
  if (categoryId) where.categoryId = categoryId;

  const status = searchParams.get("status");
  if (status) where.status = status as Prisma.EnumProductStatusFilter["equals"];

  const gender = searchParams.get("gender");
  if (gender) where.gender = gender as Prisma.EnumGenderFilter["equals"];

  if (searchParams.get("isFeatured") === "true") where.isFeatured = true;
  if (searchParams.get("isTrending") === "true") where.isTrending = true;
  if (searchParams.get("isNewArrival") === "true") where.isNewArrival = true;
  if (searchParams.get("isBestSeller") === "true") where.isBestSeller = true;

  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  if (minPrice || maxPrice) {
    where.sellingPrice = {};
    if (minPrice) where.sellingPrice.gte = parseFloat(minPrice);
    if (maxPrice) where.sellingPrice.lte = parseFloat(maxPrice);
  }

  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

  const orderBy: Prisma.ProductOrderByWithRelationInput = {
    [sortBy]: sortOrder,
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: productInclude,
      skip,
      take: limit,
      orderBy,
    }),
    prisma.product.count({ where }),
  ]);

  return successResponse({
    products,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function POST(request: Request) {
  const rl = checkRateLimit(request, "products-create", 30, 60000);
  if (!rl.success) return rateLimited();

  const admin = await getAdminUser();
  if (!admin) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Validation failed", 400, parseZodError(parsed.error));
  }

  const data = parsed.data;

  const brand = await prisma.brand.findUnique({ where: { id: data.brandId } });
  if (!brand) return errorResponse("Brand not found", 404);

  const category = await prisma.category.findUnique({
    where: { id: data.categoryId },
  });
  if (!category) return errorResponse("Category not found", 404);

  const slug = slugify(data.name);
  const existingSlug = await prisma.product.findUnique({ where: { slug } });
  const finalSlug = existingSlug ? `${slug}-${Date.now()}` : slug;

  const sku = data.sku || generateSKU(brand.name, data.name);
  const discount = calculateDiscount(data.mrp, data.sellingPrice);
  const barcodeValue = data.barcode || generateBarcodeValue(sku);

  try {
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name: data.name,
          slug: finalSlug,
          description: data.description,
          brandId: data.brandId,
          categoryId: data.categoryId,
          mrp: data.mrp,
          sellingPrice: data.sellingPrice,
          discount,
          sku,
          color: data.color,
          size: data.size,
          gender: data.gender,
          status: data.status,
          inventory: {
            create: { quantity: data.stock, minStock: 5 },
          },
          barcode: {
            create: { value: barcodeValue, type: "CODE128" },
          },
          images: data.images?.length
            ? {
                create: data.images.map((url, index) => ({
                  url,
                  sortOrder: index,
                  isPrimary: index === 0,
                })),
              }
            : undefined,
        },
        include: productInclude,
      });

      return created;
    });

    const meta = getRequestMeta(request);
    await createAuditLog({
      adminId: admin.id,
      action: "CREATE",
      entity: "product",
      entityId: product.id,
      details: { name: product.name, sku: product.sku },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return successResponse(product, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create product";
    if (message.includes("Unique constraint")) {
      return errorResponse("SKU or slug already exists", 409);
    }
    return errorResponse(message, 500);
  }
}
