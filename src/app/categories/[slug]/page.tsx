import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductGrid } from "@/components/products/product-grid";
import { STORE } from "@/lib/constants";

async function getCategory(slug: string, searchParams: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  Object.entries(searchParams).forEach(([k, v]) => {
    if (v) params.set(k, v);
  });
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/categories/${slug}?${params}`, {
    next: { revalidate: 30 },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch category");
  return res.json();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getCategory(slug, {});
  if (!data) return { title: "Category Not Found" };

  return {
    title: `${data.category.name} - Footwear`,
    description:
      data.category.description ||
      `Shop ${data.category.name} footwear at ${STORE.name}, Bilaspur.`,
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const data = await getCategory(slug, sp);

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
