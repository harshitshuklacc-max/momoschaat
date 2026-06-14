import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { WifiOff } from "lucide-react";

export const metadata: Metadata = {
  title: "Offline",
  description: "You are currently offline.",
};

export default function OfflinePage() {
  return (
    <div className="container mx-auto px-4 py-24 text-center">
      <WifiOff className="mx-auto h-16 w-16 text-muted-foreground opacity-50" />
      <h1 className="mt-6 text-2xl font-bold">You&apos;re Offline</h1>
      <p className="mt-2 text-muted-foreground">
        Please check your internet connection and try again.
      </p>
      <Button className="mt-6" asChild>
        <Link href="/">Go Home</Link>
      </Button>
    </div>
  );
}
