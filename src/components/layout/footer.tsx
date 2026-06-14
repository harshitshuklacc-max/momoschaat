import Link from "next/link";
import Image from "next/image";
import { MapPin, Phone, MessageCircle } from "lucide-react";
import { STORE } from "@/lib/constants";
import { Separator } from "@/components/ui/separator";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-black/40">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/" className="inline-flex items-center gap-2">
              <Image
                src={STORE.logo}
                alt={STORE.name}
                width={36}
                height={36}
                className="rounded-full"
              />
              <h3 className="text-lg font-bold text-gradient">{STORE.name}</h3>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              Premium luxury footwear in Bilaspur. Step into style with the finest
              collection of shoes for every occasion.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Quick Links</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/products" className="hover:text-primary transition-colors">
                  Shop All
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-primary transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-primary transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/account" className="hover:text-primary transition-colors">
                  My Account
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Contact</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                <span>{STORE.fullAddress}</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-primary" />
                <a href={`tel:${STORE.phone}`} className="hover:text-primary">
                  {STORE.phone}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 shrink-0 text-primary" />
                <a
                  href={`https://wa.me/${STORE.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary"
                >
                  WhatsApp
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Payment</h4>
            <p className="text-sm text-muted-foreground">
              UPI: <span className="text-foreground">{STORE.upiId}</span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Cash on Delivery available across Bilaspur
            </p>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row text-sm text-muted-foreground">
          <p>&copy; {currentYear} {STORE.name}. All rights reserved.</p>
          <Link
            href="/admin/login"
            className="text-xs text-primary/70 hover:text-primary transition-colors"
          >
            Admin Portal
          </Link>
        </div>
      </div>
    </footer>
  );
}
