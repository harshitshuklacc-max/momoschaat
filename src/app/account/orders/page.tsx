import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/utils";

export const metadata: Metadata = {
  title: "My Orders",
  description: "View your order history at SHOE MAFIA.",
};

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-500/20 text-yellow-400",
  CONFIRMED: "bg-blue-500/20 text-blue-400",
  PACKED: "bg-purple-500/20 text-purple-400",
  SHIPPED: "bg-indigo-500/20 text-indigo-400",
  DELIVERED: "bg-green-500/20 text-green-400",
  CANCELLED: "bg-red-500/20 text-red-400",
};

export default async function OrdersPage() {
  const user = await getAuthUser();
  if (!user?.customer) return null;

  const orders = await prisma.order.findMany({
    where: { customerId: user.customer.id },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Order History</h1>

      {orders.length === 0 ? (
        <div className="glass-card p-8 text-center text-muted-foreground">
          <p>No orders yet</p>
          <Button className="mt-4" asChild>
            <Link href="/products">Start Shopping</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/account/orders/${order.id}`}
              className="glass-card block p-4 hover:border-primary/30 transition-colors"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">#{order.orderNumber}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(order.createdAt)} · {order.items.length} item(s)
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={statusColors[order.status] || ""}>
                    {order.status}
                  </Badge>
                  <span className="font-semibold text-primary">
                    {formatCurrency(decimalToNumber(order.grandTotal))}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
