export interface BusyProductRow {
  name: string;
  barcode?: string;
  sku?: string;
  mrp: number;
  sellingPrice: number;
  stock: number;
  quantity?: number;
}

export async function parseBusyPDF(buffer: Buffer): Promise<BusyProductRow[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const uint8Array = new Uint8Array(buffer);
  const loadingTask = pdfjs.getDocument({ data: uint8Array });
  const pdf = await loadingTask.promise;

  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    fullText += pageText + "\n";
  }

  return extractProductsFromText(fullText);
}

function extractProductsFromText(text: string): BusyProductRow[] {
  const products: BusyProductRow[] = [];
  const lines = text.split(/\n|\s{2,}/).map((l) => l.trim()).filter(Boolean);

  const rowPattern =
    /(.+?)\s+(\d{8,13}|\w+-\w+-\w+)\s+(?:\w+-\w+-\w+\s+)?(\d+(?:\.\d{1,2})?)\s+(\d+(?:\.\d{1,2})?)\s+(\d+)/i;

  for (const line of lines) {
    const match = line.match(rowPattern);
    if (match) {
      products.push({
        name: match[1].trim(),
        barcode: /^\d{8,13}$/.test(match[2]) ? match[2] : undefined,
        sku: match[2],
        mrp: parseFloat(match[3]),
        sellingPrice: parseFloat(match[4]),
        stock: parseInt(match[5], 10),
      });
      continue;
    }

    const altPattern = /(.+?)\s+(\d+(?:\.\d{1,2})?)\s+(\d+(?:\.\d{1,2})?)\s+(\d+)\s*$/;
    const altMatch = line.match(altPattern);
    if (altMatch && altMatch[1].length > 3) {
      products.push({
        name: altMatch[1].trim(),
        mrp: parseFloat(altMatch[2]),
        sellingPrice: parseFloat(altMatch[3]),
        stock: parseInt(altMatch[4], 10),
      });
    }
  }

  return products;
}
