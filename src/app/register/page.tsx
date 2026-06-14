import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Register",
  description: "Create your SHOE MAFIA account to shop premium footwear in Bilaspur.",
};

export default function RegisterPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <RegisterForm />
    </div>
  );
}
