import { NextResponse } from "next/server";
import { authenticateAdmin } from "@/lib/auth";
import { adminLoginSchema } from "@/lib/validations";
import {
  checkRateLimit,
  errorResponse,
  parseZodError,
  rateLimited,
} from "@/lib/api";
import { getAdminCookieName, getAdminCookieOptions } from "@/lib/cookie-options";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rl = checkRateLimit(request, "auth-admin-login", 10, 60000);
  if (!rl.success) return rateLimited();

  const body = await request.json().catch(() => null);
  const parsed = adminLoginSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Validation failed", 400, parseZodError(parsed.error));
  }

  try {
    const result = await authenticateAdmin(
      parsed.data.username.trim(),
      parsed.data.password
    );
    if (!result) {
      return errorResponse("Invalid username or password", 401);
    }

    const response = NextResponse.json({
      success: true,
      data: {
        id: result.admin.id,
        username: result.admin.username,
        name: result.admin.name,
        email: result.admin.email,
      },
    });

    response.cookies.set(
      getAdminCookieName(),
      result.token,
      getAdminCookieOptions()
    );
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Login failed";
    console.error("Admin login error:", message);
    return errorResponse(message, 500);
  }
}
