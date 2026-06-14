"use client";

import { useEffect, useState, useCallback } from "react";
import { Download, Printer, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, type Column } from "@/components/admin/data-table";
import { adminFetch } from "@/lib/api-client";
import { formatCurrency, formatDateTime } from "@/lib/utils";

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerPhone: string | null;
  grandTotal: number;
  paymentMethod: string;
  createdAt: string;
  order?: { orderNumber: string } | null;
  _count: { items: number };
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    const res = await adminFetch<{ invoices: Invoice[] }>(`/api/invoices?${params}`);
    if (res.success && res.data) setInvoices(res.data.invoices);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(fetchInvoices, 300);
    return () => clearTimeout(timer);
  }, [fetchInvoices]);

  const downloadPdf = (id: string) => {
    window.open(`/api/invoices/${id}/pdf`, "_blank");
  };

  const reprint = (id: string) => {
    const win = window.open(`/api/invoices/${id}/pdf`, "_blank");
    win?.addEventListener("load", () => win.print());
  };

  const columns: Column<Invoice>[] = [
    { key: "invoiceNumber", header: "Invoice #", render: (i) => (
      <span className="font-mono text-sm">{i.invoiceNumber}</span>
    )},
    { key: "order", header: "Order", render: (i) => i.order?.orderNumber || "-" },
    { key: "customer", header: "Customer", render: (i) => (
      <div>
        <p>{i.customerName}</p>
        {i.customerPhone && <p className="text-xs text-muted-foreground">{i.customerPhone}</p>}
      </div>
    )},
    { key: "items", header: "Items", render: (i) => i._count.items },
    { key: "grandTotal", header: "Total", render: (i) => formatCurrency(i.grandTotal) },
    { key: "paymentMethod", header: "Payment" },
    { key: "createdAt", header: "Date", render: (i) => (
      <span className="text-xs text-muted-foreground">{formatDateTime(i.createdAt)}</span>
    )},
    { key: "actions", header: "", render: (i) => (
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" onClick={() => downloadPdf(i.id)}>
          <Download className="mr-1 h-3 w-3" />PDF
        </Button>
        <Button variant="ghost" size="sm" onClick={() => reprint(i.id)}>
          <Printer className="mr-1 h-3 w-3" />Reprint
        </Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Invoices</h1>
        <p className="text-muted-foreground">View, download, and reprint invoices</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search invoices..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-white/5 pl-10"
        />
      </div>

      <DataTable columns={columns} data={invoices} loading={loading} />
    </div>
  );
}
