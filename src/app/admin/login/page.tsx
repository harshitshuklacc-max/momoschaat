"use client";

import { useState } from "react";
import Image from "next/image";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { adminFetch } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { STORE } from "@/lib/constants";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await adminFetch<{ id: string; username: string }>("/api/auth/admin/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });

      if (res.success) {
        toast({ title: "Welcome back!" });
        window.location.href = "/admin";
        return;
      }

      toast({
        title: res.error || "Invalid username or password",
        variant: "destructive",
      });
    } catch {
      toast({
        title: "Login failed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Admin username"
                className="bg-white/5"
                autoComplete="username"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="bg-white/5"
                autoComplete="current-password"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              <Lock className="mr-2 h-4 w-4" />
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
