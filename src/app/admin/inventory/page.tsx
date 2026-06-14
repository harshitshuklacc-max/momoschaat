"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/admin/data-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { adminFetch } from "@/lib/api-client";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface InventoryItem {
  id: string;
  productId: string;
  quantity: number;
  reserved: number;
  minStock: number;
  product: { id: string; name: string; sku: string; sellingPrice: number; brand?: { name: string } };
}

interface InventoryLog {
  id: string;
  action: string;
  quantity: number;
  previousQty: number;
  newQty: number;
  notes: string | null;
  createdAt: string;
  inventory: { product: { name: string; sku: string } };
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustNotes, setAdjustNotes] = useState("");
  const [adjustLoading, setAdjustLoading] = useState(false);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (filter !== "all") params.set("filter", filter);
    const [invRes, logsRes] = await Promise.all([
      adminFetch<{ items: InventoryItem[] }>(`/api/inventory?${params}`),
      adminFetch<{ logs: InventoryLog[] }>("/api/inventory/logs?limit=10"),
    ]);
    if (invRes.success && invRes.data) setItems(invRes.data.items);
    if (logsRes.success && logsRes.data) setLogs(logsRes.data.logs);
    setLoading(false);
  }, [search, filter]);

  useEffect(() => {
    const timer = setTimeout(fetchData, 300);
    return () => clearTimeout(timer);
  }, [fetchData]);

  const handleAdjust = async () => {
    if (!adjustItem || adjustQty === 0) return;
    setAdjustLoading(true);
    const res = await adminFetch("/api/inventory/adjust", {
      method: "POST",
      body: JSON.stringify({
        productId: adjustItem.productId,
        quantity: adjustQty,
        notes: adjustNotes,
      }),
    });
    setAdjustLoading(false);
    if (res.success) {
      toast({ title: "Inventory adjusted" });
      setAdjustItem(null);
      setAdjustQty(0);
      setAdjustNotes("");
      fetchData();
    } else {
      toast({ title: res.error || "Failed", variant: "destructive" });
    }
  };

  const stockBadge = (qty: number, min: number) => {
    if (qty === 0) return <Badge variant="destructive">Out of Stock</Badge>;
    if (qty <= min) return <Badge variant="warning">Low Stock</Badge>;
    return <Badge variant="success">In Stock</Badge>;
  };

  const columns: Column<InventoryItem>[] = [
    { key: "product", header: "Product", render: (i) => (
      <div>
        <p className="font-medium">{i.product.name}</p>
        <p className="text-xs text-muted-foreground">{i.product.sku}</p>
      </div>
    )},
    { key: "quantity", header: "Quantity", render: (i) => (
      <span className="font-mono text-lg">{i.quantity}</span>
    )},
    { key: "reserved", header: "Reserved", render: (i) => i.reserved },
    { key: "minStock", header: "Min Stock", render: (i) => i.minStock },
    { key: "status", header: "Status", render: (i) => stockBadge(i.quantity, i.minStock) },
    { key: "price", header: "Price", render: (i) => formatCurrency(i.product.sellingPrice) },
    { key: "actions", header: "", render: (i) => (
      <Button variant="outline" size="sm" onClick={() => { setAdjustItem(i); setAdjustQty(0); }}>
        Adjust
      </Button>
    )},
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Inventory</h1>
        <p className="text-muted-foreground">Track stock levels and make adjustments</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search inventory..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-white/5 pl-10"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-white/5 px-3 text-sm"
        >
          <option value="all">All Stock</option>
          <option value="low">Low Stock</option>
          <option value="out">Out of Stock</option>
        </select>
      </div>

      <DataTable columns={columns} data={items} loading={loading} />

      <Card className="glass-card border-white/10">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No inventory logs yet</p>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between rounded-lg bg-white/5 p-3 text-sm">
                  <div>
                    <p className="font-medium">{log.inventory.product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {log.action} · {log.previousQty} → {log.newQty}
                      {log.notes && ` · ${log.notes}`}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!adjustItem} onOpenChange={() => setAdjustItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock — {adjustItem?.product.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Current stock: <span className="font-mono text-foreground">{adjustItem?.quantity}</span>
            </p>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={() => setAdjustQty((q) => q - 1)}>
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                type="number"
                value={adjustQty}
                onChange={(e) => setAdjustQty(parseInt(e.target.value) || 0)}
                className="w-24 text-center bg-white/5"
              />
              <Button variant="outline" size="icon" onClick={() => setAdjustQty((q) => q + 1)}>
                <Plus className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                New: {(adjustItem?.quantity || 0) + adjustQty}
              </span>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={adjustNotes}
                onChange={(e) => setAdjustNotes(e.target.value)}
                placeholder="Reason for adjustment..."
                className="bg-white/5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustItem(null)}>Cancel</Button>
            <Button onClick={handleAdjust} disabled={adjustLoading || adjustQty === 0}>
              {adjustLoading ? "Saving..." : "Apply Adjustment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
