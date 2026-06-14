import { NextRequest, NextResponse } from "next/server";
import { requireCustomer } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { productInclude, serializeProduct } from "@/lib/serializers";

export async function GET() {
  try {
    const { customer } = await requireCustomer();

    const wishlists = await prisma.wishlist.findMany({
      where: { customerId: customer.id },
      include: { product: { include: productInclude } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      items: wishlists.map((w) => ({
        id: w.id,
        productId: w.productId,
        createdAt: w.createdAt.toISOString(),
        product: serializeProduct(w.product),
      })),
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { customer } = await requireCustomer();
    const { productId } = await request.json();

    if (!productId) {
      return NextResponse.json({ error: "Product ID required" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId, status: "ACTIVE" },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const wishlist = await prisma.wishlist.upsert({
      where: {
        customerId_productId: { customerId: customer.id, productId },
      },
      update: {},
      create: { customerId: customer.id, productId },
    });

    return NextResponse.json({ id: wishlist.id, productId });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { customer } = await requireCustomer();
    const productId = request.nextUrl.searchParams.get("productId");

    if (!productId) {
      return NextResponse.json({ error: "Product ID required" }, { status: 400 });
    }

    await prisma.wishlist.deleteMany({
      where: { customerId: customer.id, productId },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
