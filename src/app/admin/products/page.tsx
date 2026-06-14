"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/admin/data-table";
import { adminFetch } from "@/lib/api-client";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Product {
  id: string;
  name: string;
  sku: string;
  sellingPrice: number;
  stock: number;
  status: string;
  brand?: { name: string };
  category?: { name: string };
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    const res = await adminFetch<{ products: Product[] }>(`/api/products?${params}`);
    if (res.success && res.data) setProducts(res.data.products);
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchProducts, 300);
    return () => clearTimeout(timer);
  }, [fetchProducts]);

  const handleBulkAction = async (action: string) => {
    if (selected.length === 0) return;
    const res = await adminFetch("/api/products/bulk", {
      method: "POST",
      body: JSON.stringify({ ids: selected, action }),
    });
    if (res.success) {
      toast({ title: (res.data as { message: string })?.message });
      setSelected([]);
      fetchProducts();
    } else {
      toast({ title: res.error || "Failed", variant: "destructive" });
    }
  };

  const statusVariant = (status: string) => {
    if (status === "ACTIVE") return "success" as const;
    if (status === "DISABLED") return "destructive" as const;
    return "warning" as const;
  };

  const columns: Column<Product>[] = [
    { key: "name", header: "Product", render: (p) => (
      <div>
        <p className="font-medium">{p.name}</p>
        <p className="text-xs text-muted-foreground">{p.sku}</p>
      </div>
    )},
    { key: "brand", header: "Brand", render: (p) => p.brand?.name || "-" },
    { key: "category", header: "Category", render: (p) => p.category?.name || "-" },
    { key: "sellingPrice", header: "Price", render: (p) => formatCurrency(p.sellingPrice) },
    { key: "stock", header: "Stock", render: (p) => (
      <span className={p.stock <= 5 ? "text-yellow-400" : ""}>{p.stock}</span>
    )},
    { key: "status", header: "Status", render: (p) => (
      <Badge variant={statusVariant(p.status)}>{p.status}</Badge>
    )},
    { key: "actions", header: "", render: (p) => (
      <Link href={`/admin/products/${p.id}/edit`}>
        <Button variant="ghost" size="sm">Edit</Button>
      </Link>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground">Manage your product catalog</p>
        </div>
        <Link href="/admin/products/new">
          <Button><Plus className="mr-2 h-4 w-4" />Add Product</Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-white/5 pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-white/5 px-3 text-sm"
        >
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="DISABLED">Disabled</option>
          <option value="DRAFT">Draft</option>
        </select>
        {selected.length > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleBulkAction("activate")}>Activate</Button>
            <Button variant="outline" size="sm" onClick={() => handleBulkAction("disable")}>Disable</Button>
            <Button variant="destructive" size="sm" onClick={() => handleBulkAction("delete")}>
              <Trash2 className="mr-1 h-3 w-3" />Delete ({selected.length})
            </Button>
          </div>
        )}
      </div>

      <DataTable
        columns={columns}
        data={products}
        selectable
        selected={selected}
        onSelectChange={setSelected}
        loading={loading}
      />
    </div>
  );
}
