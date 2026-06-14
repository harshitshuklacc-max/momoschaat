import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { queryProducts } from "@/lib/products";
import { serializeCategory } from "@/lib/serializers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = request.nextUrl;

    const category = await prisma.category.findUnique({
      where: { slug, isActive: true },
      include: {
        _count: { select: { products: { where: { status: "ACTIVE" } } } },
      },
    });

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const products = await queryProducts({
      category: slug,
      page: parseInt(searchParams.get("page") || "1"),
      limit: parseInt(searchParams.get("limit") || "20"),
      sort: searchParams.get("sort") || undefined,
      gender: searchParams.get("gender") || undefined,
      minPrice: searchParams.get("minPrice")
        ? parseFloat(searchParams.get("minPrice")!)
        : undefined,
      maxPrice: searchParams.get("maxPrice")
        ? parseFloat(searchParams.get("maxPrice")!)
        : undefined,
    });

    return NextResponse.json({
      category: serializeCategory(category),
      ...products,
    });
  } catch (error) {
    console.error("Category API error:", error);
    return NextResponse.json(
      { error: "Failed to load category" },
      { status: 500 }
    );
  }
}
