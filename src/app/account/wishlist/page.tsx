import type { Metadata } from "next";
import { WishlistPageClient } from "@/components/account/wishlist-page-client";

export const metadata: Metadata = {
  title: "My Wishlist",
  description: "View and manage your saved products at SHOE MAFIA.",
};

export default function WishlistPage() {
  return <WishlistPageClient />;
}
