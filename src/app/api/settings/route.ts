import { z } from "zod";
import { getAdminUser } from "@/lib/auth";
import { settingSchema } from "@/lib/validations";
import { getStoreSettings, setSetting } from "@/lib/settings";
import { createAuditLog } from "@/lib/audit";
import {
  checkRateLimit,
  errorResponse,
  getRequestMeta,
  parseZodError,
  rateLimited,
  successResponse,
  unauthorized,
} from "@/lib/api";

const settingsUpdateSchema = z.union([
  settingSchema,
  z.object({
    settings: z.array(settingSchema).min(1),
  }),
]);

export async function GET(request: Request) {
  const rl = checkRateLimit(request, "settings-get", 60, 60000);
  if (!rl.success) return rateLimited();

  const settings = await getStoreSettings();
  return successResponse(settings);
}

export async function PUT(request: Request) {
  const rl = checkRateLimit(request, "settings-update", 20, 60000);
  if (!rl.success) return rateLimited();

  const admin = await getAdminUser();
  if (!admin) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = settingsUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Validation failed", 400, parseZodError(parsed.error));
  }

  const updates: Array<{ key: string; value: unknown; group: string }> = [];

  if ("settings" in parsed.data) {
    for (const s of parsed.data.settings) {
      updates.push({ key: s.key, value: s.value, group: s.group });
    }
  } else {
    updates.push({
      key: parsed.data.key,
      value: parsed.data.value,
      group: parsed.data.group,
    });
  }

  const results = [];
  for (const update of updates) {
    const result = await setSetting(update.key, update.value, update.group);
    results.push(result);
  }

  const meta = getRequestMeta(request);
  await createAuditLog({
    adminId: admin.id,
    action: "UPDATE",
    entity: "settings",
    details: { keys: updates.map((u) => u.key) },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  const settings = await getStoreSettings();
  return successResponse(settings);
}
