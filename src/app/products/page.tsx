import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductGrid } from "@/components/products/product-grid";
import { ProductFilters } from "@/components/products/product-filters";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { parseProductSearchParams, queryProducts } from "@/lib/products";

export const metadata: Metadata = {
  title: "Shop All Products",
  description: "Browse our complete collection of premium footwear at SHOE MAFIA, Bilaspur.",
};

export const dynamic = "force-dynamic";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const data = await queryProducts(parseProductSearchParams(params));
  const totalPages = Math.ceil(data.total / data.limit);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Shop All</h1>
        <p className="mt-2 text-muted-foreground">
          {data.total} products available
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-4">
        <aside className="lg:col-span-1">
          <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <ProductFilters
              brands={data.filters.brands}
              categories={data.filters.categories}
              genders={data.filters.genders}
              priceRange={data.filters.priceRange}
            />
          </Suspense>
        </aside>

        <div className="lg:col-span-3">
          <ProductGrid products={data.products} />

          {totalPages > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                const pageParams = new URLSearchParams(
                  Object.entries(params).filter(([, v]) => v) as [string, string][]
                );
                pageParams.set("page", String(page));
                return (
                  <Button
                    key={page}
                    variant={page === data.page ? "default" : "outline"}
                    size="sm"
                    asChild
                  >
                    <Link href={`/products?${pageParams}`}>{page}</Link>
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
