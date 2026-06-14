"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

export interface CartItem {
  productId: string;
  name: string;
  sku: string;
  barcode?: string;
  price: number;
  quantity: number;
  discount: number;
  stock: number;
}

interface PosCartProps {
  items: CartItem[];
  cartDiscount: number;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onUpdateItemDiscount: (productId: string, discount: number) => void;
  onRemove: (productId: string) => void;
  onCartDiscountChange: (discount: number) => void;
  onCheckout: () => void;
  checkoutLoading?: boolean;
}

export function PosCart({
  items,
  cartDiscount,
  onUpdateQuantity,
  onUpdateItemDiscount,
  onRemove,
  onCartDiscountChange,
  onCheckout,
  checkoutLoading,
}: PosCartProps) {
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity - item.discount,
    0
  );
  const grandTotal = Math.max(0, subtotal - cartDiscount);

  return (
    <Card className="glass-card flex h-full flex-col border-white/10">
      <CardHeader className="border-b border-white/10">
        <CardTitle className="flex items-center justify-between">
          <span>Cart ({items.length})</span>
          <span className="text-primary">{formatCurrency(grandTotal)}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex-1 space-y-3 overflow-y-auto">
          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Scan or search products to add to cart
            </p>
          ) : (
            items.map((item) => (
              <div key={item.productId} className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.sku}</p>
                    <p className="text-sm text-primary">{formatCurrency(item.price)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-destructive"
                    onClick={() => onRemove(item.productId)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-8 text-center text-sm">{item.quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
                    disabled={item.quantity >= item.stock}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Input
                    type="number"
                    placeholder="Disc"
                    className="ml-auto h-7 w-20 bg-white/5 text-xs"
                    value={item.discount || ""}
                    onChange={(e) =>
                      onUpdateItemDiscount(item.productId, parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="space-y-3 border-t border-white/10 pt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Cart Discount</span>
              <Input
                type="number"
                className="ml-auto h-8 w-24 bg-white/5"
                value={cartDiscount || ""}
                onChange={(e) => onCartDiscountChange(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="flex items-center justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(grandTotal)}</span>
            </div>
            <Button className="w-full" size="lg" onClick={onCheckout} disabled={checkoutLoading}>
              {checkoutLoading ? "Processing..." : "Complete Sale"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
