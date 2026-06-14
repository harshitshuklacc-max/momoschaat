import { ADMIN_COOKIE, ADMIN_JWT_EXPIRY } from "./constants";

export function getAdminCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24,
    path: "/",
  };
}

export function getAuthCookieOptions(isAdmin = false) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: isAdmin ? 60 * 60 * 24 : 60 * 60 * 24 * 7,
    path: "/",
  };
}

export function getAdminCookieName() {
  return ADMIN_COOKIE;
}

export function getAdminTokenExpiry() {
  return ADMIN_JWT_EXPIRY;
}
