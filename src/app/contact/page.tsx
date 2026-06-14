import type { Metadata } from "next";
import { ContactForm, ContactInfo } from "@/components/contact/contact-page-client";
import { STORE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Contact Us",
  description: `Contact ${STORE.name} in Bilaspur. Call ${STORE.phone}, WhatsApp, or visit our store.`,
};

export default function ContactPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">Contact Us</h1>
        <p className="mt-2 text-muted-foreground">
          We&apos;d love to hear from you
        </p>
      </div>
      <div className="grid gap-8 lg:grid-cols-2 max-w-5xl mx-auto">
        <ContactInfo />
        <ContactForm />
      </div>
    </div>
  );
}
