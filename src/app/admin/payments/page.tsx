"use client";

import { useEffect, useState, useCallback } from "react";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/admin/data-table";
import { PaymentVerifyDialog } from "@/components/admin/payment-verify-dialog";
import { adminFetch } from "@/lib/api-client";
import { formatCurrency, formatDateTime } from "@/lib/utils";

interface Payment {
  id: string;
  amount: number;
  status: string;
  method: string;
  createdAt: string;
  order: {
    orderNumber: string;
    customerName: string | null;
    grandTotal: number;
  } | null;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("PENDING_VERIFICATION");

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    const res = await adminFetch<{ payments: Payment[] }>(`/api/payments?${params}`);
    if (res.success && res.data) setPayments(res.data.payments);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const columns: Column<Payment>[] = [
    { key: "order", header: "Order", render: (p) => (
      <div>
        <p className="font-mono text-sm">{p.order?.orderNumber || "-"}</p>
        <p className="text-xs text-muted-foreground">{p.order?.customerName || "Guest"}</p>
      </div>
    )},
    { key: "method", header: "Method", render: (p) => (
      <Badge variant="outline">{p.method}</Badge>
    )},
    { key: "amount", header: "Amount", render: (p) => formatCurrency(p.amount) },
    { key: "status", header: "Status", render: (p) => (
      <Badge variant={p.status === "PENDING_VERIFICATION" ? "warning" : p.status === "COMPLETED" ? "success" : "destructive"}>
        {p.status}
      </Badge>
    )},
    { key: "createdAt", header: "Date", render: (p) => (
      <span className="text-xs text-muted-foreground">{formatDateTime(p.createdAt)}</span>
    )},
    { key: "actions", header: "", render: (p) => (
      p.status === "PENDING_VERIFICATION" ? (
        <Button
          size="sm"
          onClick={() => { setSelectedPayment(p); setDialogOpen(true); }}
        >
          <CreditCard className="mr-1 h-3 w-3" />Verify
        </Button>
      ) : null
    )},
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Payments</h1>
        <p className="text-muted-foreground">UPI payment verification workflow</p>
      </div>

      <div className="flex gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-white/5 px-3 text-sm"
        >
          <option value="PENDING_VERIFICATION">Pending Verification</option>
          <option value="COMPLETED">Completed</option>
          <option value="REJECTED">Rejected</option>
          <option value="all">All</option>
        </select>
        <Button variant="outline" onClick={fetchPayments}>Refresh</Button>
      </div>

      <DataTable columns={columns} data={payments} loading={loading} />

      <PaymentVerifyDialog
        payment={selectedPayment}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onVerified={fetchPayments}
      />
    </div>
  );
}
