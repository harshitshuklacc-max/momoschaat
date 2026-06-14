"use client";

import { useEffect, useState, useCallback } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/admin/data-table";
import { adminFetch } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  user: { email: string; isActive: boolean; createdAt: string };
  _count: { orders: number; reviews: number };
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    const res = await adminFetch<{ customers: Customer[] }>(`/api/customers?${params}`);
    if (res.success && res.data) setCustomers(res.data.customers);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(fetchCustomers, 300);
    return () => clearTimeout(timer);
  }, [fetchCustomers]);

  const columns: Column<Customer>[] = [
    { key: "name", header: "Name", render: (c) => `${c.firstName} ${c.lastName}` },
    { key: "email", header: "Email", render: (c) => c.user.email },
    { key: "phone", header: "Phone", render: (c) => c.phone || "-" },
    { key: "orders", header: "Orders", render: (c) => c._count.orders },
    { key: "reviews", header: "Reviews", render: (c) => c._count.reviews },
    { key: "status", header: "Status", render: (c) => (
      <Badge variant={c.user.isActive ? "success" : "destructive"}>
        {c.user.isActive ? "Active" : "Inactive"}
      </Badge>
    )},
    { key: "joined", header: "Joined", render: (c) => (
      <span className="text-xs text-muted-foreground">{formatDateTime(c.user.createdAt)}</span>
    )},
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Customers</h1>
        <p className="text-muted-foreground">View registered customers</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search customers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-white/5 pl-10"
        />
      </div>

      <DataTable columns={columns} data={customers} loading={loading} />
    </div>
  );
}
