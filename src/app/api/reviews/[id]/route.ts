import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import {
  checkRateLimit,
  errorResponse,
  getRequestMeta,
  notFound,
  parseZodError,
  rateLimited,
  successResponse,
  unauthorized,
} from "@/lib/api";

const moderationSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = checkRateLimit(request, "reviews-moderate", 30, 60000);
  if (!rl.success) return rateLimited();

  const admin = await getAdminUser();
  if (!admin) return unauthorized();

  const { id } = await params;
  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) return notFound("Review not found");

  const body = await request.json().catch(() => null);
  const parsed = moderationSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Validation failed", 400, parseZodError(parsed.error));
  }

  const updated = await prisma.review.update({
    where: { id },
    data: { status: parsed.data.status },
    include: {
      customer: { select: { firstName: true, lastName: true } },
      product: { select: { id: true, name: true } },
    },
  });

  const meta = getRequestMeta(request);
  await createAuditLog({
    adminId: admin.id,
    action: "UPDATE",
    entity: "review",
    entityId: id,
    details: { status: parsed.data.status },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return successResponse(updated);
}
