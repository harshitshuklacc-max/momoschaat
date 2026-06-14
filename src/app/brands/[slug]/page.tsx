import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { ProductGrid } from "@/components/products/product-grid";
import { STORE } from "@/lib/constants";

async function getBrand(slug: string, searchParams: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  Object.entries(searchParams).forEach(([k, v]) => {
    if (v) params.set(k, v);
  });
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/brands/${slug}?${params}`, {
    next: { revalidate: 30 },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch brand");
  return res.json();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getBrand(slug, {});
  if (!data) return { title: "Brand Not Found" };

  return {
    title: `${data.brand.name} Shoes`,
    description:
      data.brand.description ||
      `Shop ${data.brand.name} footwear at ${STORE.name}, Bilaspur.`,
  };
}

export default async function BrandPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const data = await getBrand(slug, sp);

  if (!data) notFound();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center gap-4">
        {data.brand.logo && (
          <Image
            src={data.brand.logo}
            alt={data.brand.name}
            width={80}
            height={40}
            className="object-contain"
          />
        )}
        <div>
          <h1 className="text-3xl font-bold">{data.brand.name}</h1>
          {data.brand.description && (
            <p className="mt-2 text-muted-foreground">{data.brand.description}</p>
          )}
          <p className="mt-1 text-sm text-muted-foreground">
            {data.total} products
          </p>
        </div>
      </div>
      <ProductGrid products={data.products} />
    </div>
  );
}
