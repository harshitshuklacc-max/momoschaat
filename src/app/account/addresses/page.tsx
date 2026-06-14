import type { Metadata } from "next";
import { AddressesPageClient } from "@/components/account/addresses-page-client";

export const metadata: Metadata = {
  title: "My Addresses",
  description: "Manage your delivery addresses at SHOE MAFIA.",
};

export default function AddressesPage() {
  return <AddressesPageClient />;
}
