"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductForm } from "@/components/admin/product-form";
import { adminFetch } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import type { ProductInput } from "@/lib/validations";

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [initialData, setInitialData] = useState<Partial<ProductInput & { id: string }> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch<ProductInput & { id: string; stock: number; barcodeValue?: string }>(
      `/api/products/${params.id}`
    ).then((res) => {
      if (res.success && res.data) {
        setInitialData({
          ...res.data,
          stock: res.data.stock,
          barcode: res.data.barcodeValue,
        });
      }
      setLoading(false);
    });
  }, [params.id]);

  const handleSubmit = async (data: ProductInput) => {
    const res = await adminFetch(`/api/products/${params.id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    if (res.success) {
      toast({ title: "Product updated" });
      router.push("/admin/products");
    } else {
      toast({ title: res.error || "Failed", variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-muted-foreground">Loading...</div>;
  }

  if (!initialData) {
    return <div className="text-center text-destructive">Product not found</div>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/products">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Edit Product</h1>
          <p className="text-muted-foreground">{initialData.name}</p>
        </div>
      </div>
      <ProductForm initialData={initialData} onSubmit={handleSubmit} />
    </div>
  );
}
