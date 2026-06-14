"use client";

import { useActionState } from "react";
import Image from "next/image";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { STORE } from "@/lib/constants";
import { adminLoginAction, type AdminLoginState } from "./actions";

const initialState: AdminLoginState = {};

export default function AdminLoginPage() {
  const [state, formAction, isPending] = useActionState(adminLoginAction, initialState);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md glass-card border-white/10">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
            <Image
              src={STORE.logo}
              alt={STORE.name}
              width={48}
              height={48}
              className="rounded-full"
            />
          </div>
          <CardTitle className="text-2xl">{STORE.name}</CardTitle>
          <CardDescription>Admin Panel Login</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            {state.error && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {state.error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                placeholder="Admin username"
                className="bg-white/5"
                autoComplete="username"
                required
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Password"
                className="bg-white/5"
                autoComplete="current-password"
                required
                disabled={isPending}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
              <Lock className="mr-2 h-4 w-4" />
              {isPending ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
