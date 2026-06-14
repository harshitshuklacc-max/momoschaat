import type { Metadata } from "next";
import { SettingsPageClient } from "@/components/account/settings-page-client";

export const metadata: Metadata = {
  title: "Account Settings",
  description: "Update your SHOE MAFIA account profile and preferences.",
};

export default function SettingsPage() {
  return <SettingsPageClient />;
}
