import { getAdminUser, logout } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import {
  checkRateLimit,
  getRequestMeta,
  rateLimited,
  successResponse,
  unauthorized,
} from "@/lib/api";

export async function POST(request: Request) {
  const rl = checkRateLimit(request, "auth-admin-logout", 30, 60000);
  if (!rl.success) return rateLimited();

  const admin = await getAdminUser();
  if (!admin) return unauthorized();

  const meta = getRequestMeta(request);
  await createAuditLog({
    adminId: admin.id,
    action: "LOGOUT",
    entity: "admin",
    entityId: admin.id,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  await logout(true);
  return successResponse({ message: "Logged out successfully" });
}
