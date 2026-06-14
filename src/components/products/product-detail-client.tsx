"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Star,
  ShoppingBag,
  Heart,
  Minus,
  Plus,
  Truck,
  Shield,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/components/cart/cart-provider";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { ProductDetailData, ReviewData } from "@/lib/types";

interface ProductDetailClientProps {
  product: ProductDetailData;
  reviews: ReviewData[];
  related: { id: string; name: string; slug: string; sellingPrice: number; image: string | null }[];
}

export function ProductDetailClient({
  product,
  reviews,
  related,
}: ProductDetailClientProps) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [wishlisted, setWishlisted] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const { addItem } = useCart();
  const { toast } = useToast();

  const images = product.images.length > 0
    ? product.images
    : [{ url: product.image || "", alt: product.name, isPrimary: true }];

  const handleAddToCart = () => {
    if (!product.inStock) return;
    addItem({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      image: product.image,
      price: product.sellingPrice,
      mrp: product.mrp,
      sku: product.sku,
      maxQuantity: product.stock,
      quantity,
    });
    toast({ title: "Added to cart", description: `${quantity}x ${product.name}` });
  };

  const handleWishlist = async () => {
    try {
      const res = wishlisted
        ? await fetch(`/api/customer/wishlist?productId=${product.id}`, { method: "DELETE" })
        : await fetch("/api/customer/wishlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId: product.id }),
          });
      if (res.ok) {
        setWishlisted(!wishlisted);
        toast({ title: wishlisted ? "Removed from wishlist" : "Added to wishlist" });
      } else if (res.status === 401) {
        toast({ title: "Please login first", variant: "destructive" });
      }
    } catch {
      toast({ title: "Wishlist update failed", variant: "destructive" });
    }
  };

  const handleReview = async () => {
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          rating: reviewRating,
          comment: reviewComment,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: data.message });
      setReviewComment("");
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : "Review failed",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        href="/products"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6"
      >
        <ChevronLeft className="h-4 w-4" /> Back to Shop
      </Link>

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <div className="relative aspect-square overflow-hidden rounded-xl glass-card">
            {images[selectedImage]?.url ? (
              <Image
                src={images[selectedImage].url}
                alt={images[selectedImage].alt || product.name}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                No Image
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-4 flex gap-2 overflow-x-auto">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${
                    i === selectedImage ? "border-primary" : "border-transparent"
                  }`}
                >
                  <Image src={img.url} alt="" fill className="object-cover" sizes="64px" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-sm text-muted-foreground uppercase tracking-wider">
            <Link href={`/brands/${product.brand.slug}`} className="hover:text-primary">
              {product.brand.name}
            </Link>
            {" · "}
            <Link href={`/categories/${product.category.slug}`} className="hover:text-primary">
              {product.category.name}
            </Link>
          </p>
          <h1 className="mt-2 text-2xl sm:text-3xl font-bold">{product.name}</h1>

          {product.rating !== undefined && (
            <div className="mt-2 flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < Math.round(product.rating!)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground"
                  }`}
                />
              ))}
              <span className="ml-1 text-sm text-muted-foreground">
                ({product.reviewCount} reviews)
              </span>
            </div>
          )}

          <div className="mt-4 flex items-center gap-3">
            <span className="text-2xl font-bold text-primary">
              {formatCurrency(product.sellingPrice)}
            </span>
            {product.mrp > product.sellingPrice && (
              <>
                <span className="text-lg text-muted-foreground line-through">
                  {formatCurrency(product.mrp)}
                </span>
                <Badge>-{Math.round(product.discount)}%</Badge>
              </>
            )}
          </div>

          {product.description && (
            <p className="mt-4 text-muted-foreground leading-relaxed">
              {product.description}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            {product.color && <Badge variant="outline">Color: {product.color}</Badge>}
            {product.size && <Badge variant="outline">Size: {product.size}</Badge>}
            <Badge variant="outline">{product.gender}</Badge>
            <Badge variant="outline">SKU: {product.sku}</Badge>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <div className="flex items-center gap-1 glass rounded-lg p-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-10 text-center">{quantity}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                disabled={quantity >= product.stock}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <Button
              className="flex-1"
              size="lg"
              onClick={handleAddToCart}
              disabled={!product.inStock}
            >
              <ShoppingBag className="mr-2 h-5 w-5" />
              {product.inStock ? "Add to Cart" : "Out of Stock"}
            </Button>
            <Button variant="outline" size="icon" className="h-11 w-11" onClick={handleWishlist}>
              <Heart className={`h-5 w-5 ${wishlisted ? "fill-primary text-primary" : ""}`} />
            </Button>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Truck className="h-4 w-4 text-primary" />
              Free delivery above ₹2000
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="h-4 w-4 text-primary" />
              100% Authentic
            </div>
          </div>
        </div>
      </div>

      <Separator className="my-12" />

      <section>
        <h2 className="text-xl font-bold mb-6">
          Reviews ({reviews.length})
        </h2>

        <div className="glass-card p-4 mb-6 space-y-4">
          <h3 className="font-medium">Write a Review</h3>
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <button key={i} onClick={() => setReviewRating(i + 1)}>
                <Star
                  className={`h-5 w-5 ${
                    i < reviewRating
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground"
                  }`}
                />
              </button>
            ))}
          </div>
          <Textarea
            placeholder="Share your experience..."
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
          />
          <Button onClick={handleReview}>Submit Review</Button>
        </div>

        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="glass-card p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {review.customer.firstName} {review.customer.lastName.charAt(0)}.
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(review.createdAt)}
                </span>
              </div>
              <div className="flex gap-0.5 mt-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-3 w-3 ${
                      i < review.rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground"
                    }`}
                  />
                ))}
              </div>
              {review.comment && (
                <p className="mt-2 text-sm text-muted-foreground">{review.comment}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold mb-6">You May Also Like</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {related.map((p) => (
              <Link key={p.id} href={`/products/${p.slug}`} className="glass-card overflow-hidden group">
                <div className="relative aspect-square bg-secondary">
                  {p.image && (
                    <Image src={p.image} alt={p.name} fill className="object-cover group-hover:scale-105 transition-transform" sizes="25vw" />
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm line-clamp-2">{p.name}</p>
                  <p className="text-sm font-semibold text-primary mt-1">
                    {formatCurrency(p.sellingPrice)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
