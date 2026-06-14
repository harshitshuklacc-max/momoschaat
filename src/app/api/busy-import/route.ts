import { jsonOk, jsonError } from "@/lib/api-response";
import { withAdmin } from "@/lib/api-auth";
import { processBusyImport, listBusyImportLogs } from "@/lib/busy-import-service";

export const maxDuration = 60;

export async function POST(request: Request) {
  return withAdmin(async (admin) => {
    try {
      const formData = await request.formData();
      const file = formData.get("file");

      if (!file || !(file instanceof File)) {
        return jsonError("PDF file is required");
      }

      if (!file.name.toLowerCase().endsWith(".pdf")) {
        return jsonError("Only PDF files are supported");
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await processBusyImport(buffer, file.name, admin.id);
      return jsonOk(result);
    } catch (error) {
      console.error("BUSY import error:", error);
      return jsonError(error instanceof Error ? error.message : "Import failed", 500);
    }
  });
}

export async function GET() {
  return withAdmin(async () => {
    const logs = await listBusyImportLogs();
    return jsonOk(logs);
  });
}
