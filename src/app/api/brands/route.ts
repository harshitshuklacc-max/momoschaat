import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth";
import { brandSchema } from "@/lib/validations";
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
  const rl = checkRateLimit(request, "brands-list", 120, 60000);
  if (!rl.success) return rateLimited();

  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get("active") !== "false";

  const brands = await prisma.brand.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });

  return successResponse({ brands });
}

export async function POST(request: Request) {
  const rl = checkRateLimit(request, "brands-create", 20, 60000);
  if (!rl.success) return rateLimited();

  const admin = await getAdminUser();
  if (!admin) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = brandSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Validation failed", 400, parseZodError(parsed.error));
  }

  const slug = slugify(parsed.data.name);
  const existing = await prisma.brand.findFirst({
    where: { OR: [{ name: parsed.data.name }, { slug }] },
  });
  if (existing) {
    return errorResponse("Brand already exists", 409);
  }

  const brand = await prisma.brand.create({
    data: {
      name: parsed.data.name,
      slug,
      description: parsed.data.description,
      logo: parsed.data.logo,
    },
  });

  const meta = getRequestMeta(request);
  await createAuditLog({
    adminId: admin.id,
    action: "CREATE",
    entity: "brand",
    entityId: brand.id,
    details: { name: brand.name },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return successResponse(brand, 201);
}
