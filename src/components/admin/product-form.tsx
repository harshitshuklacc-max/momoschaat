"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productSchema, type ProductInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminFetch } from "@/lib/api-client";
import { GENDERS } from "@/lib/constants";

interface Brand { id: string; name: string }
interface Category { id: string; name: string }

interface ProductFormProps {
  initialData?: Partial<ProductInput & { id?: string }>;
  onSubmit: (data: ProductInput) => Promise<void>;
  loading?: boolean;
}

export function ProductForm({ initialData, onSubmit, loading }: ProductFormProps) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      brandId: initialData?.brandId || "",
      categoryId: initialData?.categoryId || "",
      mrp: initialData?.mrp || 0,
      sellingPrice: initialData?.sellingPrice || 0,
      sku: initialData?.sku || "",
      barcode: initialData?.barcode || "",
      color: initialData?.color || "",
      size: initialData?.size || "",
      gender: initialData?.gender || "UNISEX",
      stock: initialData?.stock || 0,
      status: initialData?.status || "ACTIVE",
    },
  });

  useEffect(() => {
    Promise.all([
      adminFetch<Brand[]>("/api/brands"),
      adminFetch<Category[]>("/api/categories"),
    ]).then(([b, c]) => {
      if (b.success && b.data) setBrands(b.data);
      if (c.success && c.data) setCategories(c.data);
    });
  }, []);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card className="glass-card border-white/10">
        <CardHeader>
          <CardTitle>Product Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="name">Product Name *</Label>
            <Input id="name" {...register("name")} className="bg-white/5" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register("description")} className="bg-white/5" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="brandId">Brand *</Label>
            <select
              id="brandId"
              {...register("brandId")}
              className="flex h-10 w-full rounded-md border border-input bg-white/5 px-3 text-sm"
            >
              <option value="">Select brand</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            {errors.brandId && <p className="text-xs text-destructive">{errors.brandId.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoryId">Category *</Label>
            <select
              id="categoryId"
              {...register("categoryId")}
              className="flex h-10 w-full rounded-md border border-input bg-white/5 px-3 text-sm"
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {errors.categoryId && <p className="text-xs text-destructive">{errors.categoryId.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="mrp">MRP (₹) *</Label>
            <Input id="mrp" type="number" step="0.01" {...register("mrp")} className="bg-white/5" />
            {errors.mrp && <p className="text-xs text-destructive">{errors.mrp.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sellingPrice">Selling Price (₹) *</Label>
            <Input id="sellingPrice" type="number" step="0.01" {...register("sellingPrice")} className="bg-white/5" />
            {errors.sellingPrice && <p className="text-xs text-destructive">{errors.sellingPrice.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sku">SKU</Label>
            <Input id="sku" {...register("sku")} placeholder="Auto-generated if empty" className="bg-white/5" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="barcode">Barcode</Label>
            <Input id="barcode" {...register("barcode")} placeholder="Auto-generated if empty" className="bg-white/5" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Color</Label>
            <Input id="color" {...register("color")} className="bg-white/5" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="size">Size</Label>
            <Input id="size" {...register("size")} className="bg-white/5" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <select id="gender" {...register("gender")} className="flex h-10 w-full rounded-md border border-input bg-white/5 px-3 text-sm">
              {GENDERS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stock">Stock</Label>
            <Input id="stock" type="number" {...register("stock")} className="bg-white/5" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select id="status" {...register("status")} className="flex h-10 w-full rounded-md border border-input bg-white/5 px-3 text-sm">
              <option value="ACTIVE">Active</option>
              <option value="DISABLED">Disabled</option>
              <option value="DRAFT">Draft</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={loading || isSubmitting}>
          {loading || isSubmitting ? "Saving..." : initialData?.id ? "Update Product" : "Create Product"}
        </Button>
      </div>
    </form>
  );
}
