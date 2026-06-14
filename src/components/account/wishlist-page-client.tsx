"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProductGrid } from "@/components/products/product-grid";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProductCardData } from "@/lib/types";

export function WishlistPageClient() {
  const [items, setItems] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [wishlistedIds, setWishlistedIds] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/customer/wishlist")
      .then((r) => r.json())
      .then((d) => {
        const products = d.items?.map(
          (i: { product: ProductCardData }) => i.product
        ) || [];
        setItems(products);
        setWishlistedIds(products.map((p: ProductCardData) => p.id));
      })
      .finally(() => setLoading(false));
  }, []);

  const handleWishlistToggle = (productId: string, added: boolean) => {
    if (!added) {
      setItems((prev) => prev.filter((p) => p.id !== productId));
      setWishlistedIds((prev) => prev.filter((id) => id !== productId));
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square w-full" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Wishlist</h1>
      {items.length === 0 ? (
        <div className="glass-card p-8 text-center text-muted-foreground">
          <p>Your wishlist is empty</p>
          <Link href="/products" className="text-primary hover:underline mt-2 inline-block">
            Browse Products
          </Link>
        </div>
      ) : (
        <ProductGrid
          products={items}
          wishlistedIds={wishlistedIds}
          onWishlistToggle={handleWishlistToggle}
        />
      )}
    </div>
  );
}
