"use client";

import { useState, useEffect } from "react";
import { Upload, FileText, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { adminUpload, adminFetch } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { formatDateTime } from "@/lib/utils";

interface ImportResult {
  fileName: string;
  totalRows: number;
  added: number;
  updated: number;
  skipped: number;
  failed: number;
  details: { row: number; name: string; status: string; message?: string }[];
}

interface ImportLog {
  id: string;
  fileName: string;
  totalRows: number;
  addedCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  createdAt: string;
  admin?: { username: string };
}

export default function BusyImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [history, setHistory] = useState<ImportLog[]>([]);
  const { toast } = useToast();

  const loadHistory = async () => {
    const res = await adminFetch<ImportLog[]>("/api/busy-import");
    if (res.success && res.data) setHistory(res.data);
  };

  useEffect(() => { loadHistory(); }, []);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await adminUpload<ImportResult>("/api/busy-import", formData);
    setLoading(false);

    if (res.success && res.data) {
      setResult(res.data);
      toast({
        title: `Import complete: ${res.data.added} added, ${res.data.updated} updated`,
      });
      loadHistory();
    } else {
      toast({
        title: res.error || "Import failed",
        variant: "destructive",
      });
    }
  };

  const statusIcon = (status: string) => {
    if (status === "added" || status === "updated") return <CheckCircle className="h-4 w-4 text-green-400" />;
    if (status === "failed") return <XCircle className="h-4 w-4 text-red-400" />;
    return <AlertCircle className="h-4 w-4 text-yellow-400" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">BUSY Import</h1>
        <p className="text-muted-foreground">Import products from BUSY accounting PDF exports</p>
      </div>

      <Card className="glass-card border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload PDF
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
            />
            <Button onClick={handleUpload} disabled={!file || loading}>
              {loading ? "Processing..." : "Import PDF"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card className="glass-card border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Import Results — {result.fileName}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              <div className="rounded-lg bg-white/5 p-3 text-center">
                <p className="text-2xl font-bold">{result.totalRows}</p>
                <p className="text-xs text-muted-foreground">Total Rows</p>
              </div>
              <div className="rounded-lg bg-green-500/10 p-3 text-center">
                <p className="text-2xl font-bold text-green-400">{result.added}</p>
                <p className="text-xs text-muted-foreground">Added</p>
              </div>
              <div className="rounded-lg bg-blue-500/10 p-3 text-center">
                <p className="text-2xl font-bold text-blue-400">{result.updated}</p>
                <p className="text-xs text-muted-foreground">Updated</p>
              </div>
              <div className="rounded-lg bg-yellow-500/10 p-3 text-center">
                <p className="text-2xl font-bold text-yellow-400">{result.skipped}</p>
                <p className="text-xs text-muted-foreground">Skipped</p>
              </div>
              <div className="rounded-lg bg-red-500/10 p-3 text-center">
                <p className="text-2xl font-bold text-red-400">{result.failed}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
            </div>

            {result.details.length > 0 && (
              <div className="max-h-64 overflow-y-auto rounded-lg border border-white/10">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5">
                      <th className="px-4 py-2 text-left">Row</th>
                      <th className="px-4 py-2 text-left">Product</th>
                      <th className="px-4 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.details.map((d) => (
                      <tr key={d.row} className="border-b border-white/5">
                        <td className="px-4 py-2">{d.row}</td>
                        <td className="px-4 py-2">{d.name}</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            {statusIcon(d.status)}
                            <Badge variant={d.status === "failed" ? "destructive" : "success"}>
                              {d.status}
                            </Badge>
                            {d.message && <span className="text-xs text-muted-foreground">{d.message}</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {history.length > 0 && (
        <Card className="glass-card border-white/10">
          <CardHeader>
            <CardTitle>Import History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {history.map((log) => (
                <div key={log.id} className="flex items-center justify-between rounded-lg bg-white/5 p-3 text-sm">
                  <div>
                    <p className="font-medium">{log.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(log.createdAt)} · {log.admin?.username || "Admin"}
                    </p>
                  </div>
                  <div className="flex gap-3 text-xs">
                    <span className="text-green-400">+{log.addedCount}</span>
                    <span className="text-blue-400">~{log.updatedCount}</span>
                    <span className="text-red-400">!{log.failedCount}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
