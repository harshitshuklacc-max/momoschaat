import { prisma } from "@/lib/prisma";
import { generateBarcodePNG } from "@/lib/barcode";
import {
  checkRateLimit,
  notFound,
  rateLimited,
} from "@/lib/api";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  const rl = checkRateLimit(request, "barcode-image", 120, 60000);
  if (!rl.success) return rateLimited();

  const { productId } = await params;
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") || "png";

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { barcode: true },
  });

  if (!product) {
    return notFound("Product not found");
  }

  const barcodeValue = product.barcode?.value || product.sku;
  const barcodeType = product.barcode?.type || "CODE128";

  if (format === "svg") {
    const { generateBarcodeSVG } = await import("@/lib/barcode");
    const svg = await generateBarcodeSVG(barcodeValue, barcodeType);
    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=86400",
      },
    });
  }

  const png = await generateBarcodePNG(barcodeValue, barcodeType);
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
