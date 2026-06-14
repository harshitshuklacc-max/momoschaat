import type { Metadata } from "next";
import { HeroSection } from "@/components/home/hero-section";
import {
  FeaturedProducts,
  NewArrivalsSection,
  BestSellersSection,
} from "@/components/home/featured-products";
import { TrendingProducts } from "@/components/home/trending-products";
import { CategoriesSection } from "@/components/home/categories-section";
import { BrandsSection } from "@/components/home/brands-section";
import { ReviewsSection } from "@/components/home/reviews-section";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { MapPin, Phone, Shield } from "lucide-react";
import { STORE } from "@/lib/constants";
import { getHomepageData } from "@/lib/homepage";

export const metadata: Metadata = {
  title: "Premium Footwear Store in Bilaspur",
  description:
    "SHOE MAFIA - Shop premium luxury footwear in Bilaspur. Featured collections, trending styles, new arrivals and best sellers.",
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const data = await getHomepageData();

  return (
    <>
      {data.hero.section.isActive && (
        <HeroSection banners={data.hero.banners} />
      )}

      {data.featured.section.isActive && (
        <FeaturedProducts
          title={data.featured.section.title}
          subtitle={data.featured.section.subtitle}
          products={data.featured.products}
        />
      )}

      {data.trending.section.isActive && (
        <TrendingProducts
          title={data.trending.section.title}
          subtitle={data.trending.section.subtitle}
          products={data.trending.products}
        />
      )}

      {data.categories.section.isActive && (
        <CategoriesSection
          title={data.categories.section.title}
          subtitle={data.categories.section.subtitle}
          categories={data.categories.items}
        />
      )}

      {data.newArrivals.section.isActive && (
        <NewArrivalsSection
          title={data.newArrivals.section.title}
          subtitle={data.newArrivals.section.subtitle}
          products={data.newArrivals.products}
        />
      )}

      {data.bestSellers.section.isActive && (
        <BestSellersSection
          title={data.bestSellers.section.title}
          subtitle={data.bestSellers.section.subtitle}
          products={data.bestSellers.products}
        />
      )}

      {data.brands.section.isActive && (
        <BrandsSection
          title={data.brands.section.title}
          subtitle={data.brands.section.subtitle}
          brands={data.brands.items}
        />
      )}

      {data.reviews.section.isActive && (
        <ReviewsSection
          title={data.reviews.section.title}
          subtitle={data.reviews.section.subtitle}
          reviews={data.reviews.items}
        />
      )}

      {data.about.section.isActive && (
        <section className="py-12 sm:py-16">
          <div className="container mx-auto px-4 text-center max-w-2xl">
            <h2 className="text-2xl sm:text-3xl font-bold">
              {data.about.section.title || "About SHOE MAFIA"}
            </h2>
            {data.about.section.subtitle && (
              <p className="mt-4 text-muted-foreground leading-relaxed">
                {data.about.section.subtitle}
              </p>
            )}
            {data.about.content && typeof data.about.content === "object" && "text" in data.about.content && (
              <p className="mt-4 text-muted-foreground leading-relaxed">
                {String(data.about.content.text)}
              </p>
            )}
            <Button className="mt-6" variant="outline" asChild>
              <Link href="/about">Learn More</Link>
            </Button>
          </div>
        </section>
      )}

      {data.contact.section.isActive && (
        <section className="py-12 sm:py-16 bg-white/[0.02]">
          <div className="container mx-auto px-4">
            <div className="glass-card max-w-xl mx-auto p-8 text-center">
              <h2 className="text-2xl font-bold">
                {data.contact.section.title || "Visit Us"}
              </h2>
              {data.contact.section.subtitle && (
                <p className="mt-2 text-muted-foreground">
                  {data.contact.section.subtitle}
                </p>
              )}
              <div className="mt-6 space-y-3 text-sm text-muted-foreground">
                <p className="flex items-center justify-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  {STORE.fullAddress}
                </p>
                <p className="flex items-center justify-center gap-2">
                  <Phone className="h-4 w-4 text-primary" />
                  {STORE.phone}
                </p>
              </div>
              <Button className="mt-6" asChild>
                <Link href="/contact">Contact Us</Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      <section className="py-10 border-t border-white/10">
        <div className="container mx-auto px-4">
          <div className="glass-card mx-auto flex max-w-md flex-col items-center gap-4 p-6 text-center sm:flex-row sm:text-left">
            <Image
              src={STORE.logo}
              alt={STORE.name}
              width={72}
              height={72}
              className="rounded-full"
            />
            <div className="flex-1">
              <h3 className="font-semibold">Store Admin Portal</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Manage products, inventory, orders, and POS from the admin dashboard.
              </p>
            </div>
            <Button variant="outline" className="border-primary/40 text-primary shrink-0" asChild>
              <Link href="/admin/login">
                <Shield className="mr-2 h-4 w-4" />
                Admin Login
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
