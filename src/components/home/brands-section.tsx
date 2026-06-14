"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import type { BrandData } from "@/lib/types";

interface BrandsSectionProps {
  title: string | null;
  subtitle: string | null;
  brands: BrandData[];
}

export function BrandsSection({ title, subtitle, brands }: BrandsSectionProps) {
  if (brands.length === 0) return null;

  return (
    <section className="py-12 sm:py-16">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <h2 className="text-2xl sm:text-3xl font-bold">
            {title || "Top Brands"}
          </h2>
          {subtitle && (
            <p className="mt-2 text-muted-foreground">{subtitle}</p>
          )}
        </motion.div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
          {brands.map((brand, index) => (
            <motion.div
              key={brand.id}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.03 }}
            >
              <Link
                href={`/brands/${brand.slug}`}
                className="glass-card flex flex-col items-center justify-center p-4 h-24 sm:h-28 hover:border-primary/30 transition-colors group"
              >
                {brand.logo ? (
                  <Image
                    src={brand.logo}
                    alt={brand.name}
                    width={80}
                    height={40}
                    className="object-contain max-h-10 opacity-80 group-hover:opacity-100 transition-opacity"
                  />
                ) : (
                  <span className="text-sm font-semibold text-center group-hover:text-primary transition-colors">
                    {brand.name}
                  </span>
                )}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
