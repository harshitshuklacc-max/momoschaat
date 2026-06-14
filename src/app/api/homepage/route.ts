import { getHomepageData } from "@/lib/homepage";
import {
  checkRateLimit,
  rateLimited,
  successResponse,
  errorResponse,
} from "@/lib/api";

export async function GET(request: Request) {
  const rl = checkRateLimit(request, "homepage", 120, 60000);
  if (!rl.success) return rateLimited();

  try {
    const data = await getHomepageData();
    return successResponse(data);
  } catch (error) {
    console.error("Homepage API error:", error);
    return errorResponse("Failed to load homepage data", 500);
  }
}
