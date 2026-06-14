import {
  adminLogin,
} from "@/lib/auth";
import { adminLoginSchema } from "@/lib/validations";
import {
  checkRateLimit,
  errorResponse,
  getRequestMeta,
  parseZodError,
  rateLimited,
  successResponse,
} from "@/lib/api";
import { createAuditLog } from "@/lib/audit";

export async function POST(request: Request) {
  const rl = checkRateLimit(request, "auth-admin-login", 10, 60000);
  if (!rl.success) return rateLimited();

  const body = await request.json().catch(() => null);
  const parsed = adminLoginSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Validation failed", 400, parseZodError(parsed.error));
  }

  try {
    const admin = await adminLogin(parsed.data.username, parsed.data.password);
    if (!admin) {
      return errorResponse("Invalid credentials", 401);
    }

    const meta = getRequestMeta(request);
    await createAuditLog({
      adminId: admin.id,
      action: "LOGIN",
      entity: "admin",
      entityId: admin.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return successResponse({
      id: admin.id,
      username: admin.username,
      name: admin.name,
      email: admin.email,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Login failed";
    return errorResponse(message, 500);
  }
}
