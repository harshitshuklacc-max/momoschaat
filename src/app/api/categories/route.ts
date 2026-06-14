import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth";
import { categorySchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";
import { slugify } from "@/lib/utils";
import {
  checkRateLimit,
  errorResponse,
  getRequestMeta,
  parseZodError,
  rateLimited,
  successResponse,
  unauthorized,
} from "@/lib/api";

export async function GET(request: Request) {
  const rl = checkRateLimit(request, "categories-list", 120, 60000);
  if (!rl.success) return rateLimited();

  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get("active") !== "false";
  const flat = searchParams.get("flat") === "true";

  const categories = await prisma.category.findMany({
    where: flat
      ? activeOnly
        ? { isActive: true }
        : undefined
      : {
          parentId: null,
          ...(activeOnly ? { isActive: true } : {}),
        },
    include: {
      _count: { select: { products: true } },
      ...(flat
        ? {}
        : {
            children: {
              where: activeOnly ? { isActive: true } : undefined,
              orderBy: { sortOrder: "asc" },
            },
          }),
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  if (flat) {
    const all = await prisma.category.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      include: { _count: { select: { products: true } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return successResponse({ categories: all });
  }

  return successResponse({ categories });
}

export async function POST(request: Request) {
  const rl = checkRateLimit(request, "categories-create", 20, 60000);
  if (!rl.success) return rateLimited();

  const admin = await getAdminUser();
  if (!admin) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Validation failed", 400, parseZodError(parsed.error));
  }

  if (parsed.data.parentId) {
    const parent = await prisma.category.findUnique({
      where: { id: parsed.data.parentId },
    });
    if (!parent) return errorResponse("Parent category not found", 404);
  }

  const slug = slugify(parsed.data.name);
  const existing = await prisma.category.findFirst({
    where: { OR: [{ name: parsed.data.name }, { slug }] },
  });
  if (existing) {
    return errorResponse("Category already exists", 409);
  }

  const category = await prisma.category.create({
    data: {
      name: parsed.data.name,
      slug,
      description: parsed.data.description,
      image: parsed.data.image,
      parentId: parsed.data.parentId,
    },
  });

  const meta = getRequestMeta(request);
  await createAuditLog({
    adminId: admin.id,
    action: "CREATE",
    entity: "category",
    entityId: category.id,
    details: { name: category.name },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return successResponse(category, 201);
}
