import type { BarcodeType } from "@prisma/client";

export function generateBarcodeValue(sku: string, type: BarcodeType = "CODE128"): string {
  if (type === "EAN13") {
    const base = sku.replace(/\D/g, "").padStart(12, "0").slice(0, 12);
    const checkDigit = calculateEAN13CheckDigit(base);
    return base + checkDigit;
  }
  return `SM${sku.replace(/[^A-Z0-9]/gi, "").toUpperCase()}`;
}

function calculateEAN13CheckDigit(base12: string): string {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(base12[i], 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const check = (10 - (sum % 10)) % 10;
  return check.toString();
}

export async function generateBarcodeSVG(
  value: string,
  type: BarcodeType = "CODE128"
): Promise<string> {
  if (type === "QR") {
    const QRCode = (await import("qrcode")).default;
    return QRCode.toString(value, { type: "svg", margin: 1 });
  }

  const bwipjs = (await import("bwip-js")).default;
  const bcid = type === "EAN13" ? "ean13" : "code128";

  return bwipjs.toSVG({
    bcid,
    text: value,
    scale: 3,
    height: 10,
    includetext: true,
    textxalign: "center",
  });
}

export async function generateBarcodePNG(
  value: string,
  type: BarcodeType = "CODE128"
): Promise<Buffer> {
  if (type === "QR") {
    const QRCode = (await import("qrcode")).default;
    return QRCode.toBuffer(value, { type: "png", margin: 1, width: 200 });
  }

  const bwipjs = (await import("bwip-js")).default;
  const bcid = type === "EAN13" ? "ean13" : "code128";

  return bwipjs.toBuffer({
    bcid,
    text: value,
    scale: 3,
    height: 10,
    includetext: true,
    textxalign: "center",
  });
}
