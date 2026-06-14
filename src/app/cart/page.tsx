import type { Metadata } from "next";
import { CartPageClient } from "@/components/cart/cart-page-client";

export const metadata: Metadata = {
  title: "Shopping Cart",
  description: "Review your cart and proceed to checkout at SHOE MAFIA.",
};

export default function CartPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <CartPageClient />
    </div>
  );
}
