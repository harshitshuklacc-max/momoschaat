"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingBag, Star } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import type { ProductCardData } from "@/lib/types";
import { useCart } from "@/components/cart/cart-provider";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: ProductCardData;
  onWishlistToggle?: (productId: string, added: boolean) => void;
  isWishlisted?: boolean;
  index?: number;
}

export function ProductCard({
  product,
  onWishlistToggle,
  isWishlisted = false,
  index = 0,
}: ProductCardProps) {
  const { addItem } = useCart();
  const { toast } = useToast();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!product.inStock) return;
    addItem({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      image: product.image,
      price: product.sellingPrice,
      mrp: product.mrp,
      sku: product.sku,
      maxQuantity: 10,
    });
    toast({ title: "Added to cart", description: product.name });
  };

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!onWishlistToggle) return;
    try {
      const res = isWishlisted
        ? await fetch(`/api/customer/wishlist?productId=${product.id}`, {
            method: "DELETE",
          })
        : await fetch("/api/customer/wishlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId: product.id }),
          });
      if (res.ok) {
        onWishlistToggle(product.id, !isWishlisted);
        toast({
          title: isWishlisted ? "Removed from wishlist" : "Added to wishlist",
        });
      } else if (res.status === 401) {
        toast({
          title: "Please login to use wishlist",
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Wishlist update failed", variant: "destructive" });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
    >
      <Link href={`/products/${product.slug}`} className="group block">
        <div className="glass-card overflow-hidden transition-all duration-300 hover:border-primary/30 hover:shadow-primary/10">
          <div className="relative aspect-square overflow-hidden bg-secondary">
            {product.image ? (
              <Image
                src={product.image}
                alt={product.name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                No Image
              </div>
            )}
            {product.discount > 0 && (
              <Badge className="absolute left-2 top-2 bg-primary">
                -{Math.round(product.discount)}%
              </Badge>
            )}
            {!product.inStock && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <span className="text-sm font-medium text-white">Out of Stock</span>
              </div>
            )}
            <div className="absolute right-2 top-2 flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              {onWishlistToggle && (
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8"
                  onClick={handleWishlist}
                >
                  <Heart
                    className={cn(
                      "h-4 w-4",
                      isWishlisted && "fill-primary text-primary"
                    )}
                  />
                </Button>
              )}
              <Button
                size="icon"
                variant="secondary"
                className="h-8 w-8"
                onClick={handleAddToCart}
                disabled={!product.inStock}
              >
                <ShoppingBag className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="p-3 sm:p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              {product.brand.name}
            </p>
            <h3 className="mt-1 text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
              {product.name}
            </h3>
            {product.rating !== undefined && (
              <div className="mt-1 flex items-center gap-1">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span className="text-xs text-muted-foreground">
                  {product.rating} ({product.reviewCount})
                </span>
              </div>
            )}
            <div className="mt-2 flex items-center gap-2">
              <span className="font-semibold text-primary">
                {formatCurrency(product.sellingPrice)}
              </span>
              {product.mrp > product.sellingPrice && (
                <span className="text-xs text-muted-foreground line-through">
                  {formatCurrency(product.mrp)}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
