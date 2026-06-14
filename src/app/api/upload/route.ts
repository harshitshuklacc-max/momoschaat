import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { getAdminUser } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import {
  checkRateLimit,
  errorResponse,
  getRequestMeta,
  rateLimited,
  successResponse,
  unauthorized,
} from "@/lib/api";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

const MAX_SIZE = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const rl = checkRateLimit(request, "upload", 20, 60000);
  if (!rl.success) return rateLimited();

  const admin = await getAdminUser();
  if (!admin) return unauthorized();

  const formData = await request.formData().catch(() => null);
  if (!formData) return errorResponse("Invalid form data", 400);

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return errorResponse("File is required", 400);
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return errorResponse(
      "Invalid file type. Allowed: JPEG, PNG, WebP, GIF",
      400
    );
  }

  if (file.size > MAX_SIZE) {
    return errorResponse("File size exceeds 5MB limit", 400);
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext)
    ? ext
    : "jpg";
  const filename = `${randomUUID()}.${safeExt}`;

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  const filepath = path.join(uploadsDir, filename);
  await writeFile(filepath, buffer);

  const url = `/uploads/${filename}`;

  const meta = getRequestMeta(request);
  await createAuditLog({
    adminId: admin.id,
    action: "CREATE",
    entity: "upload",
    details: { filename, size: file.size, type: file.type },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return successResponse(
    {
      url,
      filename,
      size: file.size,
      type: file.type,
    },
    201
  );
}
