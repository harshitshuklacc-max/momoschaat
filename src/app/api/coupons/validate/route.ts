import { z } from "zod";
import { applyCoupon } from "@/lib/orders";
import {
  checkRateLimit,
  errorResponse,
  parseZodError,
  rateLimited,
  successResponse,
} from "@/lib/api";

const validateSchema = z.object({
  code: z.string().min(1),
  orderTotal: z.coerce.number().min(0),
});

export async function POST(request: Request) {
  const rl = checkRateLimit(request, "coupons-validate", 30, 60000);
  if (!rl.success) return rateLimited();

  const body = await request.json().catch(() => null);
  const parsed = validateSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Validation failed", 400, parseZodError(parsed.error));
  }

  try {
    const result = await applyCoupon(parsed.data.code, parsed.data.orderTotal);
    return successResponse({
      valid: true,
      code: parsed.data.code.toUpperCase(),
      discount: result.discount,
      finalTotal: Math.max(0, parsed.data.orderTotal - result.discount),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid coupon";
    return errorResponse(message, 400);
  }
}
