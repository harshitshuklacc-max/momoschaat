import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { queryProducts } from "@/lib/products";
import { serializeBrand } from "@/lib/serializers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = request.nextUrl;

    const brand = await prisma.brand.findUnique({
      where: { slug, isActive: true },
      include: {
        _count: { select: { products: { where: { status: "ACTIVE" } } } },
      },
    });

    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    const products = await queryProducts({
      brand: slug,
      page: parseInt(searchParams.get("page") || "1"),
      limit: parseInt(searchParams.get("limit") || "20"),
      sort: searchParams.get("sort") || undefined,
      gender: searchParams.get("gender") || undefined,
    });

    return NextResponse.json({
      brand: serializeBrand(brand),
      ...products,
    });
  } catch (error) {
    console.error("Brand API error:", error);
    return NextResponse.json(
      { error: "Failed to load brand" },
      { status: 500 }
    );
  }
}
