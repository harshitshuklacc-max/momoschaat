"use client";

import { useEffect, useState, useCallback } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/admin/data-table";
import { adminFetch } from "@/lib/api-client";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ORDER_STATUSES } from "@/lib/constants";

interface Order {
  id: string;
  orderNumber: string;
  customerName: string | null;
  customerPhone: string | null;
  type: string;
  status: string;
  grandTotal: number;
  paymentMethod: string;
  createdAt: string;
  _count: { items: number };
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    const res = await adminFetch<{ orders: Order[] }>(`/api/orders?${params}`);
    if (res.success && res.data) setOrders(res.data.orders);
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchOrders, 300);
    return () => clearTimeout(timer);
  }, [fetchOrders]);

  const updateStatus = async (id: string, status: string) => {
    const res = await adminFetch(`/api/orders/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    if (res.success) {
      toast({ title: "Order updated" });
      fetchOrders();
    } else {
      toast({ title: res.error || "Failed", variant: "destructive" });
    }
  };

  const columns: Column<Order>[] = [
    { key: "orderNumber", header: "Order #", render: (o) => (
      <span className="font-mono text-sm">{o.orderNumber}</span>
    )},
    { key: "customer", header: "Customer", render: (o) => (
      <div>
        <p>{o.customerName || "Guest"}</p>
        {o.customerPhone && <p className="text-xs text-muted-foreground">{o.customerPhone}</p>}
      </div>
    )},
    { key: "type", header: "Type", render: (o) => (
      <Badge variant="outline">{o.type}</Badge>
    )},
    { key: "items", header: "Items", render: (o) => o._count.items },
    { key: "grandTotal", header: "Total", render: (o) => formatCurrency(o.grandTotal) },
    { key: "status", header: "Status", render: (o) => (
      <select
        value={o.status}
        onChange={(e) => updateStatus(o.id, e.target.value)}
        className="rounded-md border border-input bg-white/5 px-2 py-1 text-xs"
      >
        {ORDER_STATUSES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    )},
    { key: "createdAt", header: "Date", render: (o) => (
      <span className="text-xs text-muted-foreground">{formatDateTime(o.createdAt)}</span>
    )},
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Orders</h1>
        <p className="text-muted-foreground">Manage and update order statuses</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
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
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <Button variant="outline" onClick={fetchOrders}>Refresh</Button>
      </div>

      <DataTable columns={columns} data={orders} loading={loading} />
    </div>
  );
}
