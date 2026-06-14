import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Reset your SHOE MAFIA account password.",
};

export default function ForgotPasswordPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <ForgotPasswordForm />
    </div>
  );
}
