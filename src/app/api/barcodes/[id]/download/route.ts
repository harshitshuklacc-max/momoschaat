import { prisma } from "@/lib/prisma";
import { withAdmin } from "@/lib/api-auth";
import { jsonError } from "@/lib/api-response";
import { generateBarcodePNG, generateBarcodeSVG } from "@/lib/barcode";
import type { BarcodeType } from "@prisma/client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await withAdmin(async () => true);
  if (adminCheck instanceof Response) return adminCheck;

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") || "png";

  const barcode = await prisma.barcode.findUnique({
    where: { id },
    include: { product: { select: { name: true, sku: true } } },
  });

  if (!barcode) return jsonError("Barcode not found", 404);

  const type = barcode.type as BarcodeType;

  if (format === "svg") {
    const svg = await generateBarcodeSVG(barcode.value, type);
    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Content-Disposition": `attachment; filename="${barcode.product.sku}.svg"`,
      },
    });
  }

  if (format === "pdf") {
    const { jsPDF } = await import("jspdf");
    const pngBuffer = await generateBarcodePNG(barcode.value, type);
    const base64 = pngBuffer.toString("base64");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [80, 50] });
    doc.setFontSize(10);
    doc.text(barcode.product.name.substring(0, 30), 5, 8);
    doc.text(barcode.product.sku, 5, 14);
    doc.addImage(`data:image/png;base64,${base64}`, "PNG", 5, 18, 70, 25);
    doc.text(barcode.value, 5, 47);
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    return new Response(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${barcode.product.sku}.pdf"`,
      },
    });
  }

  const pngBuffer = await generateBarcodePNG(barcode.value, type);
  return new Response(new Uint8Array(pngBuffer), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="${barcode.product.sku}.png"`,
    },
  });
}
