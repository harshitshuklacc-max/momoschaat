export interface BusyProductRow {
  name: string;
  barcode?: string;
  sku?: string;
  mrp: number;
  sellingPrice: number;
  stock: number;
  quantity?: number;
}

interface TextItem {
  text: string;
  x: number;
  y: number;
}

async function loadPdf(buffer: Buffer) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  if ("GlobalWorkerOptions" in pdfjs) {
    pdfjs.GlobalWorkerOptions.workerSrc = "";
  }

  return pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
    disableFontFace: true,
  }).promise;
}

async function extractLines(buffer: Buffer): Promise<string[]> {
  const pdf = await loadPdf(buffer);
  const lines: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    const items: TextItem[] = [];
    for (const item of textContent.items) {
      if (!("str" in item) || !item.str?.trim()) continue;
      items.push({
        text: item.str.trim(),
        x: item.transform[4],
        y: Math.round(item.transform[5]),
      });
    }

    const rowMap = new Map<number, TextItem[]>();
    for (const item of items) {
      const bucket = rowMap.get(item.y) ?? [];
      bucket.push(item);
      rowMap.set(item.y, bucket);
    }

    const sortedRows = [...rowMap.entries()].sort((a, b) => b[0] - a[0]);

    for (const [, rowItems] of sortedRows) {
      const line = rowItems
        .sort((a, b) => a.x - b.x)
        .map((item) => item.text)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      if (line.length > 2) {
        lines.push(line);
      }
    }
  }

  return lines;
}

function parseNumber(value: string): number {
  return parseFloat(value.replace(/,/g, ""));
}

function isHeaderLine(line: string): boolean {
  const lower = line.toLowerCase();
  return (
    lower.includes("item name") ||
    lower.includes("item description") ||
    lower.includes("particulars") ||
    lower.includes("s.no") ||
    lower.includes("closing qty") ||
    lower.includes("stock summary") ||
    lower.includes("busy") && lower.includes("report")
  );
}

function parseProductLine(line: string): BusyProductRow | null {
  if (isHeaderLine(line)) return null;

  // Name + barcode + MRP + selling + stock
  const fullPattern =
    /^(.+?)\s+(\d{8,14}|[A-Z0-9]{3,}-[A-Z0-9-]+)\s+(\d+(?:\.\d{1,2})?)\s+(\d+(?:\.\d{1,2})?)\s+(\d+)\s*$/i;
  const fullMatch = line.match(fullPattern);
  if (fullMatch) {
    const barcode = /^\d{8,14}$/.test(fullMatch[2]) ? fullMatch[2] : undefined;
    return {
      name: fullMatch[1].trim(),
      barcode,
      sku: fullMatch[2],
      mrp: parseNumber(fullMatch[3]),
      sellingPrice: parseNumber(fullMatch[4]),
      stock: parseInt(fullMatch[5], 10),
    };
  }

  // Name + MRP + selling + stock
  const priceQtyPattern =
    /^(.+?)\s+(\d+(?:\.\d{1,2})?)\s+(\d+(?:\.\d{1,2})?)\s+(\d+)\s*$/;
  const priceQtyMatch = line.match(priceQtyPattern);
  if (priceQtyMatch && priceQtyMatch[1].length > 3 && !/^\d/.test(priceQtyMatch[1])) {
    return {
      name: priceQtyMatch[1].trim(),
      mrp: parseNumber(priceQtyMatch[2]),
      sellingPrice: parseNumber(priceQtyMatch[3]),
      stock: parseInt(priceQtyMatch[4], 10),
    };
  }

  // Tab/pipe separated: name | barcode | sku | mrp | price | qty
  if (line.includes("|")) {
    const parts = line.split("|").map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 4) {
      const nums = parts.slice(-3).map(parseNumber);
      if (nums.every((n) => !Number.isNaN(n))) {
        const name = parts[0];
        const maybeBarcode = parts.find((p) => /^\d{8,14}$/.test(p));
        const maybeSku = parts.find((p) => /[A-Z0-9-]{4,}/i.test(p) && p !== maybeBarcode);
        return {
          name,
          barcode: maybeBarcode,
          sku: maybeSku,
          mrp: nums[0],
          sellingPrice: nums[1],
          stock: Math.round(nums[2]),
        };
      }
    }
  }

  // Trailing barcode then prices
  const barcodePattern =
    /^(.+?)\s+(\d{8,14})\s+(\d+(?:\.\d{1,2})?)\s+(\d+(?:\.\d{1,2})?)\s+(\d+)\s*$/;
  const barcodeMatch = line.match(barcodePattern);
  if (barcodeMatch) {
    return {
      name: barcodeMatch[1].trim(),
      barcode: barcodeMatch[2],
      sku: barcodeMatch[2],
      mrp: parseNumber(barcodeMatch[3]),
      sellingPrice: parseNumber(barcodeMatch[4]),
      stock: parseInt(barcodeMatch[5], 10),
    };
  }

  return null;
}

function dedupeProducts(products: BusyProductRow[]): BusyProductRow[] {
  const seen = new Set<string>();
  const result: BusyProductRow[] = [];

  for (const product of products) {
    const key = `${product.barcode || ""}|${product.sku || ""}|${product.name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(product);
  }

  return result;
}

export async function parseBusyPDF(buffer: Buffer): Promise<BusyProductRow[]> {
  const lines = await extractLines(buffer);
  const products: BusyProductRow[] = [];

  for (const line of lines) {
    const product = parseProductLine(line);
    if (product && product.name.length > 2) {
      products.push(product);
    }
  }

  if (products.length === 0) {
    const joined = lines.join("\n");
    const chunks = joined.split(/\n+/).map((l) => l.trim()).filter(Boolean);
    for (const chunk of chunks) {
      const product = parseProductLine(chunk);
      if (product) products.push(product);
    }
  }

  return dedupeProducts(products);
}
