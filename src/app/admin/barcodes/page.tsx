"use client";

import { useEffect, useState, useCallback } from "react";
import { Download, Printer, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, type Column } from "@/components/admin/data-table";
import { adminFetch } from "@/lib/api-client";

interface BarcodeRow {
  id: string;
  value: string;
  type: string;
  product: { id: string; name: string; sku: string };
}

export default function BarcodesPage() {
  const [barcodes, setBarcodes] = useState<BarcodeRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchBarcodes = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    const res = await adminFetch<{ barcodes: BarcodeRow[] }>(`/api/barcodes?${params}`);
    if (res.success && res.data) setBarcodes(res.data.barcodes);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(fetchBarcodes, 300);
    return () => clearTimeout(timer);
  }, [fetchBarcodes]);

  const download = (id: string, format: string) => {
    window.open(`/api/barcodes/${id}/download?format=${format}`, "_blank");
  };

  const printBarcode = (id: string) => {
    const win = window.open(`/api/barcodes/${id}/download?format=png`, "_blank");
    win?.addEventListener("load", () => win.print());
  };

  const columns: Column<BarcodeRow>[] = [
    { key: "product", header: "Product", render: (b) => (
      <div>
        <p className="font-medium">{b.product.name}</p>
        <p className="text-xs text-muted-foreground">{b.product.sku}</p>
      </div>
    )},
    { key: "value", header: "Barcode", render: (b) => (
      <code className="rounded bg-white/10 px-2 py-1 text-xs">{b.value}</code>
    )},
    { key: "type", header: "Type" },
    { key: "actions", header: "Actions", render: (b) => (
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" onClick={() => download(b.id, "png")}>
          <Download className="mr-1 h-3 w-3" />PNG
        </Button>
        <Button variant="ghost" size="sm" onClick={() => download(b.id, "svg")}>SVG</Button>
        <Button variant="ghost" size="sm" onClick={() => download(b.id, "pdf")}>PDF</Button>
        <Button variant="ghost" size="sm" onClick={() => printBarcode(b.id)}>
          <Printer className="mr-1 h-3 w-3" />Print
        </Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Barcodes</h1>
        <p className="text-muted-foreground">Manage and download product barcodes</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search barcodes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-white/5 pl-10"
        />
      </div>

      <DataTable columns={columns} data={barcodes} loading={loading} />
    </div>
  );
}
