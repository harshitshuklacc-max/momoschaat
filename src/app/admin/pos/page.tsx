"use client";

import { useState, useCallback } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarcodeScanner } from "@/components/admin/barcode-scanner";
import { PosCart, type CartItem } from "@/components/admin/pos-cart";
import { adminFetch } from "@/lib/api-client";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface SearchProduct {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  sellingPrice: number;
  stock: number;
}

export default function PosPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartDiscount, setCartDiscount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchProduct[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "UPI" | "CARD">("CASH");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const { toast } = useToast();

  const addToCart = useCallback((product: SearchProduct) => {
    if (product.stock <= 0) {
      toast({ title: "Out of stock", variant: "destructive" });
      return;
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          barcode: product.barcode,
          price: product.sellingPrice,
          quantity: 1,
          discount: 0,
          stock: product.stock,
        },
      ];
    });
  }, [toast]);

  const handleScan = async (barcode: string) => {
    const res = await adminFetch<SearchProduct[]>(`/api/pos/search?barcode=${encodeURIComponent(barcode)}`);
    if (res.success && res.data?.length) {
      addToCart(res.data[0]);
      toast({ title: `Added: ${res.data[0].name}` });
    } else {
      toast({ title: "Product not found", variant: "destructive" });
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    const res = await adminFetch<SearchProduct[]>(`/api/pos/search?q=${encodeURIComponent(searchQuery)}`);
    if (res.success && res.data) setSearchResults(res.data);
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((i) => i.productId !== productId));
      return;
    }
    setCart((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, quantity } : i))
    );
  };

  const updateItemDiscount = (productId: string, discount: number) => {
    setCart((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, discount } : i))
    );
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setCheckoutLoading(true);
    const res = await adminFetch<{ order: { orderNumber: string }; invoice: { invoiceNumber: string } }>(
      "/api/pos/sale",
      {
        method: "POST",
        body: JSON.stringify({
          items: cart.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            discount: i.discount,
          })),
          customerName: customerName || undefined,
          customerPhone: customerPhone || undefined,
          paymentMethod,
          discount: cartDiscount,
        }),
      }
    );
    setCheckoutLoading(false);

    if (res.success && res.data) {
      toast({
        title: "Sale completed!",
        description: `Order ${res.data.order.orderNumber} · Invoice ${res.data.invoice.invoiceNumber}`,
      });
      setCart([]);
      setCartDiscount(0);
      setCustomerName("");
      setCustomerPhone("");
    } else {
      toast({ title: res.error || "Checkout failed", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Point of Sale</h1>
        <p className="text-muted-foreground">Process in-store sales</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="glass-card border-white/10">
            <CardHeader>
              <CardTitle>Scanner</CardTitle>
            </CardHeader>
            <CardContent>
              <BarcodeScanner onScan={handleScan} disabled={checkoutLoading} />
            </CardContent>
          </Card>

          <Card className="glass-card border-white/10">
            <CardHeader>
              <CardTitle>Manual Search</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search by name, SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="bg-white/5"
                />
                <Button onClick={handleSearch}><Search className="h-4 w-4" /></Button>
              </div>
              {searchResults.length > 0 && (
                <div className="space-y-2">
                  {searchResults.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-lg bg-white/5 p-3"
                    >
                      <div>
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.sku} · Stock: {p.stock} · {formatCurrency(p.sellingPrice)}
                        </p>
                      </div>
                      <Button size="sm" onClick={() => addToCart(p)} disabled={p.stock <= 0}>
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card border-white/10">
            <CardHeader>
              <CardTitle>Customer (Optional)</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Walk-in Customer"
                  className="bg-white/5"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Phone number"
                  className="bg-white/5"
                />
              </div>
              <div className="space-y-2">
                <Label>Payment</Label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as "CASH" | "UPI" | "CARD")}
                  className="flex h-10 w-full rounded-md border border-input bg-white/5 px-3 text-sm"
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">Card</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <PosCart
            items={cart}
            cartDiscount={cartDiscount}
            onUpdateQuantity={updateQuantity}
            onUpdateItemDiscount={updateItemDiscount}
            onRemove={(id) => setCart((prev) => prev.filter((i) => i.productId !== id))}
            onCartDiscountChange={setCartDiscount}
            onCheckout={handleCheckout}
            checkoutLoading={checkoutLoading}
          />
        </div>
      </div>
    </div>
  );
}
