import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { rateLimit, getClientIp } from "./rate-limit";
import { PAGINATION } from "./constants";

export function jsonResponse<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(
  message: string,
  status = 400,
  details?: unknown
) {
  return NextResponse.json({ success: false, error: message, details }, { status });
}

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function unauthorized(message = "Unauthorized") {
  return errorResponse(message, 401);
}

export function forbidden(message = "Forbidden") {
  return errorResponse(message, 403);
}

export function notFound(message = "Not found") {
  return errorResponse(message, 404);
}

export function rateLimited() {
  return errorResponse("Too many requests. Please try again later.", 429);
}

export function parseZodError(error: ZodError) {
  return error.errors.map((e) => ({
    field: e.path.join("."),
    message: e.message,
  }));
}

export function checkRateLimit(
  request: Request,
  key: string,
  limit = 100,
  windowMs = 60000
) {
  const ip = getClientIp(request);
  return rateLimit(`${key}:${ip}`, limit, windowMs);
}

export function getPaginationParams(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const rawLimit = parseInt(
    searchParams.get("limit") || String(PAGINATION.defaultLimit),
    10
  );
  const limit = Math.min(
    PAGINATION.maxLimit,
    Math.max(1, rawLimit || PAGINATION.defaultLimit)
  );
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function getRequestMeta(request: Request) {
  return {
    ipAddress: getClientIp(request),
    userAgent: request.headers.get("user-agent") || undefined,
  };
}

export async function parseJsonBody<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
