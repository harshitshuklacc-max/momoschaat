import { ProductCard } from "./product-card";
import type { ProductCardData } from "@/lib/types";

interface ProductGridProps {
  products: ProductCardData[];
  wishlistedIds?: string[];
  onWishlistToggle?: (productId: string, added: boolean) => void;
}

export function ProductGrid({
  products,
  wishlistedIds = [],
  onWishlistToggle,
}: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        <p className="text-lg">No products found</p>
        <p className="mt-2 text-sm">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          index={index}
          isWishlisted={wishlistedIds.includes(product.id)}
          onWishlistToggle={onWishlistToggle}
        />
      ))}
    </div>
  );
}
