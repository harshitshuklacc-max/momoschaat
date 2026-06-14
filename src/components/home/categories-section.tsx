"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import type { CategoryData } from "@/lib/types";

interface CategoriesSectionProps {
  title: string | null;
  subtitle: string | null;
  categories: CategoryData[];
}

export function CategoriesSection({
  title,
  subtitle,
  categories,
}: CategoriesSectionProps) {
  if (categories.length === 0) return null;

  return (
    <section className="py-12 sm:py-16 bg-white/[0.02]">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <h2 className="text-2xl sm:text-3xl font-bold">
            {title || "Shop by Category"}
          </h2>
          {subtitle && (
            <p className="mt-2 text-muted-foreground">{subtitle}</p>
          )}
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {categories.map((cat, index) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
            >
              <Link href={`/categories/${cat.slug}`} className="group block">
                <div className="glass-card overflow-hidden aspect-[4/3] relative">
                  {cat.image ? (
                    <Image
                      src={cat.image}
                      alt={cat.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                      sizes="(max-width: 640px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-secondary text-4xl font-bold text-primary/30">
                      {cat.name.charAt(0)}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
                    <h3 className="font-semibold text-sm sm:text-base group-hover:text-primary transition-colors">
                      {cat.name}
                    </h3>
                    {cat.productCount !== undefined && (
                      <p className="text-xs text-muted-foreground">
                        {cat.productCount} products
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
