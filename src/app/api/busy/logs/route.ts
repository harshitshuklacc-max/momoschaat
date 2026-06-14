import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth";
import {
  checkRateLimit,
  getPaginationParams,
  rateLimited,
  successResponse,
  unauthorized,
} from "@/lib/api";

export async function GET(request: Request) {
  const rl = checkRateLimit(request, "busy-logs", 60, 60000);
  if (!rl.success) return rateLimited();

  const admin = await getAdminUser();
  if (!admin) return unauthorized();

  const { searchParams } = new URL(request.url);
  const { page, limit, skip } = getPaginationParams(searchParams);

  const [logs, total] = await Promise.all([
    prisma.busyImportLog.findMany({
      include: {
        admin: { select: { id: true, username: true, name: true } },
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.busyImportLog.count(),
  ]);

  return successResponse({
    logs,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
