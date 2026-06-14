import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductGrid } from "@/components/products/product-grid";
import { STORE } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { parseProductSearchParams, queryProducts } from "@/lib/products";
import { serializeCategory } from "@/lib/serializers";

async function getCategoryData(
  slug: string,
  searchParams: Record<string, string | undefined>
) {
  const category = await prisma.category.findUnique({
    where: { slug, isActive: true },
    include: {
      _count: { select: { products: { where: { status: "ACTIVE" } } } },
    },
  });

  if (!category) return null;

  const products = await queryProducts({
    ...parseProductSearchParams(searchParams),
    category: slug,
  });

  return {
    category: serializeCategory(category),
    ...products,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getCategoryData(slug, {});
  if (!data) return { title: "Category Not Found" };

  return {
    title: `${data.category.name} - Footwear`,
    description:
      data.category.description ||
      `Shop ${data.category.name} footwear at ${STORE.name}, Bilaspur.`,
  };
}

export const dynamic = "force-dynamic";

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const data = await getCategoryData(slug, sp);

  if (!data) notFound();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{data.category.name}</h1>
        {data.category.description && (
          <p className="mt-2 text-muted-foreground">{data.category.description}</p>
        )}
        <p className="mt-1 text-sm text-muted-foreground">
          {data.total} products
        </p>
      </div>
      <ProductGrid products={data.products} />
    </div>
  );
}
