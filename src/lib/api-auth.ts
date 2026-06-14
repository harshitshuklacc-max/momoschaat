import { getAdminUser } from "./auth";
import { unauthorized } from "./api-response";

export async function withAdmin<T>(
  handler: (admin: NonNullable<Awaited<ReturnType<typeof getAdminUser>>>) => Promise<T>
): Promise<T | Response> {
  const admin = await getAdminUser();
  if (!admin) return unauthorized();
  return handler(admin);
}
