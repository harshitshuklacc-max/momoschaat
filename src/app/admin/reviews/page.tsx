"use client";

import { useEffect, useState, useCallback } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/admin/data-table";
import { adminFetch } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Review {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  status: string;
  createdAt: string;
  product: { id: string; name: string; sku: string };
  customer: { firstName: string; lastName: string };
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    const res = await adminFetch<{ reviews: Review[] }>(`/api/reviews?${params}`);
    if (res.success && res.data) setReviews(res.data.reviews);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const updateStatus = async (id: string, status: "APPROVED" | "REJECTED") => {
    const res = await adminFetch(`/api/reviews/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    if (res.success) {
      toast({ title: `Review ${status.toLowerCase()}` });
      fetchReviews();
    } else {
      toast({ title: res.error || "Failed", variant: "destructive" });
    }
  };

  const columns: Column<Review>[] = [
    { key: "product", header: "Product", render: (r) => (
      <div>
        <p className="font-medium">{r.product.name}</p>
        <p className="text-xs text-muted-foreground">{r.product.sku}</p>
      </div>
    )},
    { key: "customer", header: "Customer", render: (r) => `${r.customer.firstName} ${r.customer.lastName}` },
    { key: "rating", header: "Rating", render: (r) => (
      <div className="flex items-center gap-1">
        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
        {r.rating}
      </div>
    )},
    { key: "comment", header: "Review", render: (r) => (
      <div className="max-w-xs">
        {r.title && <p className="font-medium">{r.title}</p>}
        <p className="truncate text-xs text-muted-foreground">{r.comment || "-"}</p>
      </div>
    )},
    { key: "status", header: "Status", render: (r) => (
      <Badge variant={r.status === "APPROVED" ? "success" : r.status === "REJECTED" ? "destructive" : "warning"}>
        {r.status}
      </Badge>
    )},
    { key: "createdAt", header: "Date", render: (r) => (
      <span className="text-xs text-muted-foreground">{formatDateTime(r.createdAt)}</span>
    )},
    { key: "actions", header: "", render: (r) => (
      r.status === "PENDING" ? (
        <div className="flex gap-1">
          <Button size="sm" onClick={() => updateStatus(r.id, "APPROVED")}>Approve</Button>
          <Button size="sm" variant="destructive" onClick={() => updateStatus(r.id, "REJECTED")}>Reject</Button>
        </div>
      ) : null
    )},
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reviews</h1>
        <p className="text-muted-foreground">Moderate customer product reviews</p>
      </div>

      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="h-10 rounded-md border border-input bg-white/5 px-3 text-sm"
      >
        <option value="PENDING">Pending</option>
        <option value="APPROVED">Approved</option>
        <option value="REJECTED">Rejected</option>
      </select>

      <DataTable columns={columns} data={reviews} loading={loading} />
    </div>
  );
}
