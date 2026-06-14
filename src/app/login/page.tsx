import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to your SHOE MAFIA account to track orders and manage wishlist.",
};

export default function LoginPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <LoginForm />
    </div>
  );
}
