"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductForm } from "@/components/admin/product-form";
import { adminFetch } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import type { ProductInput } from "@/lib/validations";

export default function NewProductPage() {
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (data: ProductInput) => {
    const res = await adminFetch("/api/products", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (res.success) {
      toast({ title: "Product created" });
      router.push("/admin/products");
    } else {
      toast({ title: res.error || "Failed", variant: "destructive" });
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/products">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Add Product</h1>
          <p className="text-muted-foreground">Create a new product listing</p>
        </div>
      </div>
      <ProductForm onSubmit={handleSubmit} />
    </div>
  );
}
