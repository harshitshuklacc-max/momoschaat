import { NextResponse } from "next/server";
import { authenticateAdmin } from "@/lib/auth";
import { adminLoginSchema } from "@/lib/validations";
import {
  checkRateLimit,
  errorResponse,
  getRequestMeta,
  parseZodError,
  rateLimited,
} from "@/lib/api";
import { createAuditLog } from "@/lib/audit";
import { getAdminCookieName, getAdminCookieOptions } from "@/lib/cookie-options";

export async function POST(request: Request) {
  const rl = checkRateLimit(request, "auth-admin-login", 10, 60000);
  if (!rl.success) return rateLimited();

  const body = await request.json().catch(() => null);
  const parsed = adminLoginSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Validation failed", 400, parseZodError(parsed.error));
  }

  try {
    const result = await authenticateAdmin(parsed.data.username, parsed.data.password);
    if (!result) {
      return errorResponse("Invalid username or password", 401);
    }

    const { admin, token } = result;

    try {
      const meta = getRequestMeta(request);
      await createAuditLog({
        adminId: admin.id,
        action: "LOGIN",
        entity: "admin",
        entityId: admin.id,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
    } catch {
      // Login should succeed even if audit logging fails
    }

    const response = NextResponse.json({
      success: true,
      data: {
        id: admin.id,
        username: admin.username,
        name: admin.name,
        email: admin.email,
      },
    });

    response.cookies.set(getAdminCookieName(), token, getAdminCookieOptions());
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Login failed";
    console.error("Admin login error:", message);
    return errorResponse(message, 500);
  }
}
