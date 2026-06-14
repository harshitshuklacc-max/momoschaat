"use client";

import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import type { ReviewData } from "@/lib/types";

interface ReviewsSectionProps {
  title: string | null;
  subtitle: string | null;
  reviews: ReviewData[];
}

export function ReviewsSection({ title, subtitle, reviews }: ReviewsSectionProps) {
  if (reviews.length === 0) return null;

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
            {title || "Customer Reviews"}
          </h2>
          {subtitle && (
            <p className="mt-2 text-muted-foreground">{subtitle}</p>
          )}
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((review, index) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="glass-card p-5"
            >
              <Quote className="h-8 w-8 text-primary/30 mb-3" />
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < review.rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground"
                    }`}
                  />
                ))}
              </div>
              {review.title && (
                <h4 className="font-semibold mb-2">{review.title}</h4>
              )}
              {review.comment && (
                <p className="text-sm text-muted-foreground line-clamp-4">
                  {review.comment}
                </p>
              )}
              <p className="mt-4 text-sm font-medium">
                {review.customer.firstName} {review.customer.lastName.charAt(0)}.
                {review.isVerified && (
                  <span className="ml-2 text-xs text-primary">Verified</span>
                )}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
