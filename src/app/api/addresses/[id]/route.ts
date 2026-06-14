import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { addressSchema } from "@/lib/validations";
import {
  checkRateLimit,
  errorResponse,
  notFound,
  parseZodError,
  rateLimited,
  successResponse,
  unauthorized,
} from "@/lib/api";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = checkRateLimit(request, "addresses-update", 20, 60000);
  if (!rl.success) return rateLimited();

  const user = await getAuthUser();
  if (!user?.customer) return unauthorized();

  const { id } = await params;
  const existing = await prisma.address.findFirst({
    where: { id, customerId: user.customer.id },
  });
  if (!existing) return notFound("Address not found");

  const body = await request.json().catch(() => null);
  const parsed = addressSchema.partial().safeParse(body);
  if (!parsed.success) {
    return errorResponse("Validation failed", 400, parseZodError(parsed.error));
  }

  const data = parsed.data;

  const address = await prisma.$transaction(async (tx) => {
    if (data.isDefault) {
      await tx.address.updateMany({
        where: { customerId: user.customer!.id, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return tx.address.update({
      where: { id },
      data,
    });
  });

  return successResponse(address);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = checkRateLimit(request, "addresses-delete", 20, 60000);
  if (!rl.success) return rateLimited();

  const user = await getAuthUser();
  if (!user?.customer) return unauthorized();

  const { id } = await params;
  const existing = await prisma.address.findFirst({
    where: { id, customerId: user.customer.id },
  });
  if (!existing) return notFound("Address not found");

  await prisma.address.delete({ where: { id } });

  if (existing.isDefault) {
    const next = await prisma.address.findFirst({
      where: { customerId: user.customer.id },
      orderBy: { createdAt: "desc" },
    });
    if (next) {
      await prisma.address.update({
        where: { id: next.id },
        data: { isDefault: true },
      });
    }
  }

  return successResponse({ message: "Address deleted" });
}
