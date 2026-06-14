"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";

interface FilterOption {
  id: string;
  name: string;
  slug: string;
}

interface ProductFiltersProps {
  brands: FilterOption[];
  categories: FilterOption[];
  genders: string[];
  priceRange: { min: number; max: number };
}

export function ProductFilters({
  brands,
  categories,
  genders,
  priceRange,
}: ProductFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") params.set(key, value);
      else params.delete(key);
      params.delete("page");
      router.push(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  const clearFilters = () => router.push(window.location.pathname);

  const hasFilters =
    searchParams.has("brand") ||
    searchParams.has("category") ||
    searchParams.has("gender") ||
    searchParams.has("minPrice") ||
    searchParams.has("maxPrice") ||
    searchParams.has("sort");

  return (
    <div className="glass-card space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Filters</h3>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="mr-1 h-3 w-3" /> Clear
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <Label>Sort By</Label>
        <Select
          value={searchParams.get("sort") || "newest"}
          onValueChange={(v) => updateParams("sort", v === "newest" ? "" : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="price-asc">Price: Low to High</SelectItem>
            <SelectItem value="price-desc">Price: High to Low</SelectItem>
            <SelectItem value="discount">Best Discount</SelectItem>
            <SelectItem value="name">Name</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Category</Label>
        <Select
          value={searchParams.get("category") || "all"}
          onValueChange={(v) => updateParams("category", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.slug}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Brand</Label>
        <Select
          value={searchParams.get("brand") || "all"}
          onValueChange={(v) => updateParams("brand", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="All Brands" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Brands</SelectItem>
            {brands.map((b) => (
              <SelectItem key={b.id} value={b.slug}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Gender</Label>
        <Select
          value={searchParams.get("gender") || "all"}
          onValueChange={(v) => updateParams("gender", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {genders.map((g) => (
              <SelectItem key={g} value={g}>
                {g.charAt(0) + g.slice(1).toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Price Range</Label>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder={`Min (${priceRange.min})`}
            defaultValue={searchParams.get("minPrice") || ""}
            onBlur={(e) => updateParams("minPrice", e.target.value)}
          />
          <Input
            type="number"
            placeholder={`Max (${priceRange.max})`}
            defaultValue={searchParams.get("maxPrice") || ""}
            onBlur={(e) => updateParams("maxPrice", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
