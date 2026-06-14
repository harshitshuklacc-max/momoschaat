"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { STORE } from "@/lib/constants";
import type { HeroBannerData } from "@/lib/types";

interface HeroSectionProps {
  banners: HeroBannerData[];
}

export function HeroSection({ banners }: HeroSectionProps) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  if (banners.length === 0) {
    return (
      <section className="relative h-[50vh] min-h-[400px] flex items-center justify-center glass">
        <div className="text-center px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mx-auto mb-6"
          >
            <Image
              src={STORE.logo}
              alt={STORE.name}
              width={140}
              height={140}
              className="mx-auto rounded-full shadow-2xl shadow-primary/20"
              priority
            />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-6xl font-bold"
          >
            Welcome to <span className="text-gradient">{STORE.name}</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-4 text-muted-foreground text-lg"
          >
            Premium Footwear in Bilaspur
          </motion.p>
          <Button className="mt-6" size="lg" asChild>
            <Link href="/products">Shop Now</Link>
          </Button>
        </div>
      </section>
    );
  }

  const banner = banners[current];

  return (
    <section className="relative h-[50vh] min-h-[400px] overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={banner.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0"
        >
          <Image
            src={banner.image}
            alt={banner.title}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
        </motion.div>
      </AnimatePresence>

      <div className="relative container mx-auto px-4 h-full flex items-center">
        <motion.div
          key={`text-${banner.id}`}
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-lg"
        >
          <h1 className="text-3xl sm:text-5xl font-bold leading-tight">
            {banner.title}
          </h1>
          {banner.subtitle && (
            <p className="mt-3 text-muted-foreground text-lg">{banner.subtitle}</p>
          )}
          {banner.link && (
            <Button className="mt-6" size="lg" asChild>
              <Link href={banner.link}>
                {banner.buttonText || "Shop Now"}
              </Link>
            </Button>
          )}
        </motion.div>
      </div>

      {banners.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 glass"
            onClick={() => setCurrent((c) => (c - 1 + banners.length) % banners.length)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 glass"
            onClick={() => setCurrent((c) => (c + 1) % banners.length)}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {banners.map((_, i) => (
              <button
                key={i}
                className={`h-2 rounded-full transition-all ${
                  i === current ? "w-6 bg-primary" : "w-2 bg-white/40"
                }`}
                onClick={() => setCurrent(i)}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
