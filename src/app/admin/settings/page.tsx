"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { adminFetch } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { BARCODE_TYPES } from "@/lib/constants";

interface Settings {
  storeName?: string;
  storePhone?: string;
  storeAddress?: string;
  upiId?: string;
  taxRate?: number;
  taxEnabled?: boolean;
  barcodeType?: string;
  invoicePrefix?: string;
  theme?: { primary: string; background: string };
  store_name?: string;
  store_phone?: string;
  store_address?: string;
  upi_id?: string;
  tax_rate?: number;
  tax_enabled?: boolean;
  barcode_type?: string;
  invoice_prefix?: string;
  theme_primary?: string;
  theme_background?: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    adminFetch<Settings>("/api/settings").then((res) => {
      if (res.success && res.data) setSettings(res.data);
      setLoading(false);
    });
  }, []);

  const get = (camel: keyof Settings, snake: keyof Settings, fallback = "") => {
    return String(settings[camel] ?? settings[snake] ?? fallback);
  };

  const getBool = (camel: keyof Settings, snake: keyof Settings) => {
    return Boolean(settings[camel] ?? settings[snake]);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      store_name: get("storeName", "store_name"),
      store_phone: get("storePhone", "store_phone"),
      store_address: get("storeAddress", "store_address"),
      upi_id: get("upiId", "upi_id"),
      tax_rate: parseFloat(get("taxRate", "tax_rate", "0")),
      tax_enabled: getBool("taxEnabled", "tax_enabled"),
      barcode_type: get("barcodeType", "barcode_type", "CODE128"),
      invoice_prefix: get("invoicePrefix", "invoice_prefix", "INV"),
      theme_primary: get("theme", "theme_primary") !== "[object Object]"
        ? get("theme", "theme_primary", "#dc2626")
        : (settings.theme?.primary || "#dc2626"),
      theme_background: settings.theme?.background || get("theme_background", "theme_background", "#0a0a0a"),
    };

    const res = await adminFetch("/api/settings", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    setSaving(false);

    if (res.success) {
      toast({ title: "Settings saved" });
      if (res.data) setSettings(res.data as Settings);
    } else {
      toast({ title: res.error || "Failed", variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-muted-foreground">Loading settings...</div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Configure store, theme, invoice, tax, and barcode settings</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Card className="glass-card border-white/10">
        <CardHeader>
          <CardTitle>Store Information</CardTitle>
          <CardDescription>Basic store details shown on invoices and website</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>Store Name</Label>
            <Input
              value={get("storeName", "store_name")}
              onChange={(e) => setSettings({ ...settings, storeName: e.target.value, store_name: e.target.value })}
              className="bg-white/5"
            />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input
              value={get("storePhone", "store_phone")}
              onChange={(e) => setSettings({ ...settings, storePhone: e.target.value, store_phone: e.target.value })}
              className="bg-white/5"
            />
          </div>
          <div className="space-y-2">
            <Label>UPI ID</Label>
            <Input
              value={get("upiId", "upi_id")}
              onChange={(e) => setSettings({ ...settings, upiId: e.target.value, upi_id: e.target.value })}
              className="bg-white/5"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Address</Label>
            <Input
              value={get("storeAddress", "store_address")}
              onChange={(e) => setSettings({ ...settings, storeAddress: e.target.value, store_address: e.target.value })}
              className="bg-white/5"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-white/10">
        <CardHeader>
          <CardTitle>Tax Settings</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Tax Rate (%)</Label>
            <Input
              type="number"
              value={get("taxRate", "tax_rate", "0")}
              onChange={(e) => setSettings({ ...settings, taxRate: parseFloat(e.target.value), tax_rate: parseFloat(e.target.value) })}
              className="bg-white/5"
            />
          </div>
          <div className="flex items-center gap-3 pt-6">
            <input
              type="checkbox"
              id="taxEnabled"
              checked={getBool("taxEnabled", "tax_enabled")}
              onChange={(e) => setSettings({ ...settings, taxEnabled: e.target.checked, tax_enabled: e.target.checked })}
              className="h-4 w-4"
            />
            <Label htmlFor="taxEnabled">Enable Tax</Label>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-white/10">
        <CardHeader>
          <CardTitle>Invoice & Barcode</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Invoice Prefix</Label>
            <Input
              value={get("invoicePrefix", "invoice_prefix", "INV")}
              onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value, invoice_prefix: e.target.value })}
              className="bg-white/5"
            />
          </div>
          <div className="space-y-2">
            <Label>Barcode Type</Label>
            <select
              value={get("barcodeType", "barcode_type", "CODE128")}
              onChange={(e) => setSettings({ ...settings, barcodeType: e.target.value, barcode_type: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-white/5 px-3 text-sm"
            >
              {BARCODE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-white/10">
        <CardHeader>
          <CardTitle>Theme</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Primary Color</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={settings.theme?.primary || get("theme_primary", "theme_primary", "#dc2626")}
                onChange={(e) => setSettings({
                  ...settings,
                  theme: { ...settings.theme, primary: e.target.value, background: settings.theme?.background || "#0a0a0a" },
                  theme_primary: e.target.value,
                })}
                className="h-10 w-16 bg-white/5 p-1"
              />
              <Input
                value={settings.theme?.primary || get("theme_primary", "theme_primary", "#dc2626")}
                onChange={(e) => setSettings({
                  ...settings,
                  theme: { ...settings.theme, primary: e.target.value, background: settings.theme?.background || "#0a0a0a" },
                  theme_primary: e.target.value,
                })}
                className="bg-white/5"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Background Color</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={settings.theme?.background || get("theme_background", "theme_background", "#0a0a0a")}
                onChange={(e) => setSettings({
                  ...settings,
                  theme: { primary: settings.theme?.primary || "#dc2626", background: e.target.value },
                  theme_background: e.target.value,
                })}
                className="h-10 w-16 bg-white/5 p-1"
              />
              <Input
                value={settings.theme?.background || get("theme_background", "theme_background", "#0a0a0a")}
                onChange={(e) => setSettings({
                  ...settings,
                  theme: { primary: settings.theme?.primary || "#dc2626", background: e.target.value },
                  theme_background: e.target.value,
                })}
                className="bg-white/5"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
