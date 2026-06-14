"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import { Copy, Check, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { STORE } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface UpiPaymentProps {
  orderId: string;
  amount: number;
  onSuccess: () => void;
}

export function UpiPayment({ orderId, amount, onSuccess }: UpiPaymentProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [upiReference, setUpiReference] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const upiString = `upi://pay?pa=${STORE.upiId}&pn=${encodeURIComponent(STORE.name)}&am=${amount}&cu=INR`;
    QRCode.toDataURL(upiString, { width: 256, margin: 2, color: { dark: "#dc2626" } })
      .then(setQrDataUrl)
      .catch(console.error);
  }, [amount]);

  const copyUpiId = async () => {
    await navigator.clipboard.writeText(STORE.upiId);
    setCopied(true);
    toast({ title: "UPI ID copied" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setScreenshotUrl(data.url);
      toast({ title: "Screenshot uploaded" });
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : "Upload failed",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!upiReference.trim()) {
      toast({ title: "Enter UTR/Reference number", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/payments/upi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, upiReference, screenshotUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: data.message });
      onSuccess();
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : "Submission failed",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="glass-card p-6 space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold">Pay via UPI</h3>
        <p className="text-2xl font-bold text-primary mt-1">
          {formatCurrency(amount)}
        </p>
      </div>

      {qrDataUrl && (
        <div className="flex justify-center">
          <div className="rounded-xl bg-white p-4">
            <Image src={qrDataUrl} alt="UPI QR Code" width={200} height={200} />
          </div>
        </div>
      )}

      <div className="flex items-center justify-center gap-2">
        <code className="glass rounded-lg px-3 py-2 text-sm">{STORE.upiId}</code>
        <Button variant="outline" size="icon" onClick={copyUpiId}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="upiReference">UPI Reference / UTR Number</Label>
        <Input
          id="upiReference"
          placeholder="Enter transaction reference"
          value={upiReference}
          onChange={(e) => setUpiReference(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Payment Screenshot</Label>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleUpload}
        />
        <Button
          variant="outline"
          className="w-full"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          {screenshotUrl ? "Change Screenshot" : "Upload Screenshot"}
        </Button>
        {screenshotUrl && (
          <p className="text-xs text-green-500">Screenshot uploaded successfully</p>
        )}
      </div>

      <Button className="w-full" size="lg" onClick={handleSubmit} disabled={submitting}>
        {submitting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : null}
        I&apos;ve Paid
      </Button>
    </div>
  );
}
