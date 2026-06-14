import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { addressSchema } from "@/lib/validations";
import {
  checkRateLimit,
  errorResponse,
  parseZodError,
  rateLimited,
  successResponse,
  unauthorized,
} from "@/lib/api";

export async function GET(request: Request) {
  const rl = checkRateLimit(request, "addresses-list", 60, 60000);
  if (!rl.success) return rateLimited();

  const user = await getAuthUser();
  if (!user?.customer) return unauthorized();

  const addresses = await prisma.address.findMany({
    where: { customerId: user.customer.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  return successResponse({ addresses });
}

export async function POST(request: Request) {
  const rl = checkRateLimit(request, "addresses-create", 20, 60000);
  if (!rl.success) return rateLimited();

  const user = await getAuthUser();
  if (!user?.customer) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = addressSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Validation failed", 400, parseZodError(parsed.error));
  }

  const data = parsed.data;

  const address = await prisma.$transaction(async (tx) => {
    if (data.isDefault) {
      await tx.address.updateMany({
        where: { customerId: user.customer!.id },
        data: { isDefault: false },
      });
    }

    return tx.address.create({
      data: {
        customerId: user.customer!.id,
        ...data,
      },
    });
  });

  return successResponse(address, 201);
}
