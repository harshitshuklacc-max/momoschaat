"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { ProductGrid } from "@/components/products/product-grid";
import type { ProductCardData } from "@/lib/types";

interface ProductSectionProps {
  title: string | null;
  subtitle: string | null;
  products: ProductCardData[];
  viewAllHref?: string;
}

export function FeaturedProducts({
  title,
  subtitle,
  products,
  viewAllHref = "/products?featured=true",
}: ProductSectionProps) {
  if (products.length === 0) return null;

  return (
    <section className="py-12 sm:py-16">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex items-end justify-between mb-8"
        >
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold">
              {title || "Featured Collection"}
            </h2>
            {subtitle && (
              <p className="mt-2 text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <Link
            href={viewAllHref}
            className="hidden sm:flex items-center gap-1 text-sm text-primary hover:underline"
          >
            View All <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
        <ProductGrid products={products} />
        <div className="mt-6 text-center sm:hidden">
          <Link href={viewAllHref} className="text-sm text-primary hover:underline">
            View All
          </Link>
        </div>
      </div>
    </section>
  );
}

export function TrendingProducts(props: ProductSectionProps) {
  return (
    <FeaturedProducts
      {...props}
      viewAllHref={props.viewAllHref || "/products?trending=true"}
      title={props.title || "Trending Now"}
    />
  );
}

export function NewArrivalsSection(props: ProductSectionProps) {
  return (
    <FeaturedProducts
      {...props}
      viewAllHref={props.viewAllHref || "/products?newArrival=true"}
      title={props.title || "New Arrivals"}
    />
  );
}

export function BestSellersSection(props: ProductSectionProps) {
  return (
    <FeaturedProducts
      {...props}
      viewAllHref={props.viewAllHref || "/products?bestSeller=true"}
      title={props.title || "Best Sellers"}
    />
  );
}
