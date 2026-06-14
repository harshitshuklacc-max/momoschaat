"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { checkoutSchema, type CheckoutInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/components/cart/cart-provider";
import { UpiPayment } from "@/components/checkout/upi-payment";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { CreditCard, Banknote, Loader2 } from "lucide-react";

export function CheckoutForm() {
  const { items, subtotal, clearCart } = useCart();
  const router = useRouter();
  const { toast } = useToast();
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "UPI">("COD");
  const [loading, setLoading] = useState(false);
  const [orderComplete, setOrderComplete] = useState<{
    orderId: string;
    orderNumber: string;
    grandTotal: number;
    paymentMethod: string;
  } | null>(null);

  const shipping = subtotal >= 2000 ? 0 : items.length > 0 ? 99 : 0;
  const total = subtotal + shipping;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      paymentMethod: "COD",
      shippingAddress: {
        label: "Home",
        country: "India",
        isDefault: false,
      },
    },
  });

  const onSubmit = async (data: CheckoutInput) => {
    if (items.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          paymentMethod,
          items: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      if (paymentMethod === "COD") {
        clearCart();
        toast({ title: "Order placed successfully!" });
        router.push(`/account/orders/${result.order.id}`);
      } else {
        setOrderComplete({
          orderId: result.order.id,
          orderNumber: result.order.orderNumber,
          grandTotal: result.order.grandTotal,
          paymentMethod: "UPI",
        });
      }
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : "Checkout failed",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpiSuccess = () => {
    clearCart();
    if (orderComplete) {
      router.push(`/account/orders/${orderComplete.orderId}`);
    }
  };

  if (items.length === 0 && !orderComplete) {
    return (
      <div className="text-center py-16">
        <h1 className="text-2xl font-bold">Your cart is empty</h1>
        <Button className="mt-4" asChild>
          <Link href="/products">Shop Now</Link>
        </Button>
      </div>
    );
  }

  if (orderComplete && paymentMethod === "UPI") {
    return (
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">Complete Payment</h1>
          <p className="text-muted-foreground mt-2">
            Order #{orderComplete.orderNumber}
          </p>
        </div>
        <UpiPayment
          orderId={orderComplete.orderId}
          amount={orderComplete.grandTotal}
          onSuccess={handleUpiSuccess}
        />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-6">
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Contact Details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="customerName">Full Name</Label>
              <Input id="customerName" {...register("customerName")} />
              {errors.customerName && (
                <p className="text-xs text-destructive">{errors.customerName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerPhone">Phone</Label>
              <Input id="customerPhone" {...register("customerPhone")} />
              {errors.customerPhone && (
                <p className="text-xs text-destructive">{errors.customerPhone.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerEmail">Email (Optional)</Label>
              <Input id="customerEmail" type="email" {...register("customerEmail")} />
            </div>
          </div>
        </div>

        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Shipping Address</h2>
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input id="fullName" {...register("shippingAddress.fullName")} />
            {errors.shippingAddress?.fullName && (
              <p className="text-xs text-destructive">
                {errors.shippingAddress.fullName.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="addrPhone">Phone</Label>
            <Input id="addrPhone" {...register("shippingAddress.phone")} />
            {errors.shippingAddress?.phone && (
              <p className="text-xs text-destructive">
                {errors.shippingAddress.phone.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="line1">Address</Label>
            <Input id="line1" {...register("shippingAddress.line1")} />
            {errors.shippingAddress?.line1 && (
              <p className="text-xs text-destructive">
                {errors.shippingAddress.line1.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="line2">Address Line 2</Label>
            <Input id="line2" {...register("shippingAddress.line2")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" {...register("shippingAddress.city")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" {...register("shippingAddress.state")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pincode">Pincode</Label>
              <Input id="pincode" {...register("shippingAddress.pincode")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Order Notes (Optional)</Label>
            <Textarea id="notes" {...register("notes")} />
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Payment Method</h2>
          <div className="grid gap-3">
            <button
              type="button"
              onClick={() => setPaymentMethod("COD")}
              className={`flex items-center gap-3 rounded-lg border p-4 transition-colors ${
                paymentMethod === "COD"
                  ? "border-primary bg-primary/10"
                  : "border-white/10 hover:border-white/20"
              }`}
            >
              <Banknote className="h-5 w-5 text-primary" />
              <div className="text-left">
                <p className="font-medium">Cash on Delivery</p>
                <p className="text-xs text-muted-foreground">Pay when you receive</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod("UPI")}
              className={`flex items-center gap-3 rounded-lg border p-4 transition-colors ${
                paymentMethod === "UPI"
                  ? "border-primary bg-primary/10"
                  : "border-white/10 hover:border-white/20"
              }`}
            >
              <CreditCard className="h-5 w-5 text-primary" />
              <div className="text-left">
                <p className="font-medium">UPI Payment</p>
                <p className="text-xs text-muted-foreground">Pay via UPI / GPay / PhonePe</p>
              </div>
            </button>
          </div>
        </div>

        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Order Summary</h2>
          <Separator />
          {items.map((item) => (
            <div key={item.productId} className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {item.name} x{item.quantity}
              </span>
              <span>{formatCurrency(item.price * item.quantity)}</span>
            </div>
          ))}
          <Separator />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Shipping</span>
            <span>{shipping === 0 ? "Free" : formatCurrency(shipping)}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-semibold text-lg">
            <span>Total</span>
            <span className="text-primary">{formatCurrency(total)}</span>
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {paymentMethod === "COD" ? "Place Order" : "Proceed to UPI Payment"}
          </Button>
        </div>
      </div>
    </form>
  );
}
