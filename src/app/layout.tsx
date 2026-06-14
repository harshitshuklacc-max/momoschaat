import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { STORE } from "@/lib/constants";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: `${STORE.name} - Premium Footwear Store`,
    template: `%s | ${STORE.name}`,
  },
  description:
    "SHOE MAFIA - Premium luxury footwear store in Bilaspur, Chhattisgarh. Shop the latest trends in shoes for men, women, and kids.",
  keywords: ["shoes", "footwear", "Bilaspur", "SHOE MAFIA", "sneakers", "luxury shoes"],
  authors: [{ name: STORE.name }],
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: STORE.name,
    title: `${STORE.name} - Premium Footwear Store`,
    description: "Premium luxury footwear store in Bilaspur, Chhattisgarh",
  },
  twitter: {
    card: "summary_large_image",
    title: `${STORE.name} - Premium Footwear Store`,
    description: "Premium luxury footwear store in Bilaspur, Chhattisgarh",
  },
  robots: { index: true, follow: true },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <ServiceWorkerRegister />
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
