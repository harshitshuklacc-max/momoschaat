import { prisma } from "@/lib/prisma";
import { withAdmin } from "@/lib/api-auth";
import { jsonOk } from "@/lib/api-response";
import { decimalToNumber } from "@/lib/utils";

export async function GET(request: Request) {
  return withAdmin(async () => {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    const barcode = searchParams.get("barcode");

    if (barcode) {
      const product = await prisma.product.findFirst({
        where: {
          status: "ACTIVE",
          barcode: { value: barcode },
        },
        include: {
          inventory: true,
          barcode: true,
          brand: { select: { name: true } },
        },
      });
      if (!product) return jsonOk([]);
      return jsonOk([
        {
          id: product.id,
          name: product.name,
          sku: product.sku,
          barcode: product.barcode?.value,
          sellingPrice: decimalToNumber(product.sellingPrice),
          mrp: decimalToNumber(product.mrp),
          stock: product.inventory?.quantity ?? 0,
          brand: product.brand.name,
        },
      ]);
    }

    const products = await prisma.product.findMany({
      where: {
        status: "ACTIVE",
        OR: q
          ? [
              { name: { contains: q, mode: "insensitive" } },
              { sku: { contains: q, mode: "insensitive" } },
              { barcode: { value: { contains: q } } },
            ]
          : undefined,
      },
      include: {
        inventory: true,
        barcode: true,
        brand: { select: { name: true } },
      },
      take: 20,
      orderBy: { name: "asc" },
    });

    return jsonOk(
      products.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode?.value,
        sellingPrice: decimalToNumber(p.sellingPrice),
        mrp: decimalToNumber(p.mrp),
        stock: p.inventory?.quantity ?? 0,
        brand: p.brand.name,
      }))
    );
  });
}
