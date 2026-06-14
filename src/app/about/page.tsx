import type { Metadata } from "next";
import { getHomepageData } from "@/lib/homepage";
import { STORE } from "@/lib/constants";
import { MapPin, Phone, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "About Us",
  description: `Learn about ${STORE.name} - Premium luxury footwear store in Bilaspur, Chhattisgarh.`,
};

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const data = await getHomepageData();
  const about = data.about;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold text-center">
          {about.section.title || `About ${STORE.name}`}
        </h1>
        {about.section.subtitle && (
          <p className="mt-4 text-lg text-muted-foreground text-center leading-relaxed">
            {about.section.subtitle}
          </p>
        )}

        <div className="glass-card p-8 mt-8 space-y-6">
          {about.content && typeof about.content === "object" && "text" in about.content ? (
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
              {String(about.content.text)}
            </p>
          ) : (
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Welcome to {STORE.name}, Bilaspur&apos;s premier destination for luxury
                footwear. Located at {STORE.fullAddress}, we bring you the finest
                collection of shoes from top brands across India.
              </p>
              <p>
                From casual sneakers to formal dress shoes, our curated selection caters
                to men, women, and kids. Every pair we sell is 100% authentic, backed
                by our commitment to quality and customer satisfaction.
              </p>
              <p>
                Visit our store or shop online with convenient COD and UPI payment options.
                Free delivery on orders above ₹2,000 within Bilaspur.
              </p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3 pt-4 border-t border-white/10">
            <div className="text-center">
              <MapPin className="h-6 w-6 mx-auto text-primary mb-2" />
              <p className="text-sm font-medium">Visit Us</p>
              <p className="text-xs text-muted-foreground mt-1">Bilaspur, CG</p>
            </div>
            <div className="text-center">
              <Phone className="h-6 w-6 mx-auto text-primary mb-2" />
              <p className="text-sm font-medium">Call Us</p>
              <p className="text-xs text-muted-foreground mt-1">{STORE.phone}</p>
            </div>
            <div className="text-center">
              <MessageCircle className="h-6 w-6 mx-auto text-primary mb-2" />
              <p className="text-sm font-medium">WhatsApp</p>
              <p className="text-xs text-muted-foreground mt-1">Quick Support</p>
            </div>
          </div>
        </div>

        <div className="text-center mt-8">
          <Button asChild size="lg">
            <a href={`https://wa.me/${STORE.whatsapp}`} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="mr-2 h-5 w-5" /> Chat With Us
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
