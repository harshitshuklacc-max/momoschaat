import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/utils";
import { ChevronLeft, Check } from "lucide-react";

export const metadata: Metadata = {
  title: "Order Details",
  description: "Track your SHOE MAFIA order status and details.",
};

const trackingSteps = [
  "PENDING",
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
];

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getAuthUser();
  if (!user?.customer) return null;

  const { id } = await params;

  const order = await prisma.order.findFirst({
    where: { id, customerId: user.customer.id },
    include: {
      items: {
        include: {
          product: {
            include: { images: { where: { isPrimary: true }, take: 1 } },
          },
        },
      },
      payments: { include: { verification: true } },
    },
  });

  if (!order) notFound();

  const currentStep = trackingSteps.indexOf(order.status);
  const payment = order.payments[0];
  const address = order.shippingAddress as {
    fullName?: string;
    phone?: string;
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
  } | null;

  return (
    <div>
      <Link
        href="/account/orders"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6"
      >
        <ChevronLeft className="h-4 w-4" /> Back to Orders
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Order #{order.orderNumber}</h1>
          <p className="text-sm text-muted-foreground">
            Placed on {formatDateTime(order.createdAt)}
          </p>
        </div>
        <Badge>{order.status}</Badge>
      </div>

      {!["CANCELLED", "RETURNED", "REFUNDED"].includes(order.status) && (
        <div className="glass-card p-6 mb-6">
          <h2 className="font-semibold mb-4">Order Tracking</h2>
          <div className="flex justify-between">
            {trackingSteps.map((step, i) => (
              <div key={step} className="flex flex-col items-center flex-1">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    i <= currentStep
                      ? "bg-primary text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i < currentStep ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span className="text-xs">{i + 1}</span>
                  )}
                </div>
                <span className="mt-2 text-xs text-center text-muted-foreground hidden sm:block">
                  {step.charAt(0) + step.slice(1).toLowerCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card p-6 space-y-4">
          <h2 className="font-semibold">Items</h2>
          {order.items.map((item) => (
            <div key={item.id} className="flex gap-3">
              <div className="relative h-16 w-16 shrink-0 rounded-lg bg-secondary overflow-hidden">
                {item.product?.images[0]?.url && (
                  <Image
                    src={item.product.images[0].url}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  Qty: {item.quantity} · {formatCurrency(decimalToNumber(item.price))}
                </p>
              </div>
              <span className="text-sm font-semibold">
                {formatCurrency(decimalToNumber(item.total))}
              </span>
            </div>
          ))}
          <Separator />
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(decimalToNumber(order.subtotal))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span>{formatCurrency(decimalToNumber(order.shipping))}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span className="text-primary">
                {formatCurrency(decimalToNumber(order.grandTotal))}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {address && (
            <div className="glass-card p-6">
              <h2 className="font-semibold mb-3">Shipping Address</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {address.fullName}<br />
                {address.line1}<br />
                {address.line2 && <>{address.line2}<br /></>}
                {address.city}, {address.state} {address.pincode}<br />
                {address.phone}
              </p>
            </div>
          )}

          {payment && (
            <div className="glass-card p-6">
              <h2 className="font-semibold mb-3">Payment</h2>
              <p className="text-sm">
                Method: <span className="font-medium">{payment.method}</span>
              </p>
              <p className="text-sm mt-1">
                Status: <Badge variant="outline">{payment.status}</Badge>
              </p>
              {payment.verification && (
                <div className="mt-3 text-sm text-muted-foreground">
                  {payment.verification.upiReference && (
                    <p>Ref: {payment.verification.upiReference}</p>
                  )}
                  <p>Verification: {payment.verification.status}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
