import { getAdminUser } from "@/lib/auth";
import { jsonOk, unauthorized } from "@/lib/api-response";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return unauthorized();
  return jsonOk({
    id: admin.id,
    username: admin.username,
    name: admin.name,
    email: admin.email,
  });
}
