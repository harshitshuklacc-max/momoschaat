import type { Metadata } from "next";
import Link from "next/link";
import { Package, Heart, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "My Account",
  description: "Manage your SHOE MAFIA account, orders, and preferences.",
};

export default async function AccountPage() {
  const user = await getAuthUser();
  if (!user?.customer) return null;

  const [orderCount, wishlistCount, addressCount] = await Promise.all([
    prisma.order.count({ where: { customerId: user.customer.id } }),
    prisma.wishlist.count({ where: { customerId: user.customer.id } }),
    prisma.address.count({ where: { customerId: user.customer.id } }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">
        Hello, {user.customer.firstName}!
      </h1>
      <p className="text-muted-foreground mb-8">{user.email}</p>

      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <div className="glass-card p-6 text-center">
          <Package className="h-8 w-8 mx-auto text-primary mb-2" />
          <p className="text-2xl font-bold">{orderCount}</p>
          <p className="text-sm text-muted-foreground">Orders</p>
        </div>
        <div className="glass-card p-6 text-center">
          <Heart className="h-8 w-8 mx-auto text-primary mb-2" />
          <p className="text-2xl font-bold">{wishlistCount}</p>
          <p className="text-sm text-muted-foreground">Wishlist</p>
        </div>
        <div className="glass-card p-6 text-center">
          <MapPin className="h-8 w-8 mx-auto text-primary mb-2" />
          <p className="text-2xl font-bold">{addressCount}</p>
          <p className="text-sm text-muted-foreground">Addresses</p>
        </div>
      </div>

      <div className="glass-card p-6">
        <h2 className="font-semibold mb-4">Account Details</h2>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Name</dt>
            <dd>{user.customer.firstName} {user.customer.lastName}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Phone</dt>
            <dd>{user.customer.phone || "Not set"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Member since</dt>
            <dd>{formatDate(user.customer.createdAt)}</dd>
          </div>
        </dl>
        <Button className="mt-6" variant="outline" asChild>
          <Link href="/account/settings">Edit Profile</Link>
        </Button>
      </div>
    </div>
  );
}
