"use server";

import { redirect } from "next/navigation";
import { authenticateAdmin } from "@/lib/auth";
import { setAuthCookie } from "@/lib/auth";

export type AdminLoginState = {
  error?: string;
};

export async function adminLoginAction(
  _prevState: AdminLoginState,
  formData: FormData
): Promise<AdminLoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { error: "Username and password are required" };
  }

  try {
    const result = await authenticateAdmin(username, password);
    if (!result) {
      return { error: "Invalid username or password" };
    }

    await setAuthCookie(result.token, true);
  } catch (error) {
    console.error("Admin login action error:", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Login failed. Check database connection and env variables.",
    };
  }

  redirect("/admin");
}
