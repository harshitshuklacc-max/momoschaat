import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetailClient } from "@/components/products/product-detail-client";
import { STORE } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import {
  productInclude,
  serializeProductDetail,
  serializeReview,
} from "@/lib/serializers";

async function getProductBySlug(slug: string) {
  const product = await prisma.product.findUnique({
    where: { slug, status: "ACTIVE" },
    include: {
      ...productInclude,
      reviews: {
        where: { status: "APPROVED" },
        include: {
          customer: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!product) return null;

  const related = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      categoryId: product.categoryId,
      id: { not: product.id },
    },
    include: productInclude,
    take: 4,
    orderBy: { createdAt: "desc" },
  });

  return {
    product: serializeProductDetail(product),
    reviews: product.reviews.map(serializeReview),
    related: related.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      sellingPrice: Number(p.sellingPrice),
      image: p.images.find((i) => i.isPrimary)?.url ?? p.images[0]?.url ?? null,
    })),
  };
}

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getProductBySlug(slug);
  if (!data) return { title: "Product Not Found" };

  return {
    title: data.product.name,
    description:
      data.product.description ||
      `Buy ${data.product.name} at ${STORE.name}, Bilaspur. Premium footwear at best prices.`,
    openGraph: {
      title: data.product.name,
      description: data.product.description || undefined,
      images: data.product.image ? [data.product.image] : undefined,
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getProductBySlug(slug);

  if (!data) notFound();

  return (
    <ProductDetailClient
      product={data.product}
      reviews={data.reviews}
      related={data.related}
    />
  );
}
