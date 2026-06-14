import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyJwt } from "@/lib/jwt";
import { ADMIN_COOKIE } from "@/lib/constants";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(ADMIN_COOKIE)?.value;

  if (pathname === "/admin/login") {
    if (token) {
      try {
        const payload = await verifyJwt(token);
        if (payload.role === "admin") {
          return NextResponse.redirect(new URL("/admin", request.url));
        }
      } catch {
        // invalid token — show login page
      }
    }
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  try {
    const payload = await verifyJwt(token);
    if (payload.role !== "admin") {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  } catch {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
