import { getAdminUser } from "@/lib/auth";
import { unauthorized, successResponse, errorResponse } from "@/lib/api";
import { processBusyImport } from "@/lib/busy-import-service";

export const maxDuration = 60;

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return unauthorized();

  const formData = await request.formData().catch(() => null);
  if (!formData) return errorResponse("Invalid form data", 400);

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return errorResponse("PDF file is required", 400);
  }

  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return errorResponse("Only PDF files are supported", 400);
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await processBusyImport(buffer, file.name, admin.id);
    return successResponse(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import failed";
    return errorResponse(message, 400);
  }
}
