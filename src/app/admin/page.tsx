"use client";

import { useEffect, useState } from "react";
import {
  Package,
  ShoppingCart,
  Users,
  IndianRupee,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { StatsCard } from "@/components/admin/stats-card";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { SalesChart } from "@/components/admin/sales-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminFetch } from "@/lib/api-client";
import { formatCurrency } from "@/lib/utils";

interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  pendingOrders: number;
  totalCustomers: number;
  pendingReviews: number;
  pendingPayments: number;
  todayOrders: number;
  totalRevenue: number;
  todayRevenue: number;
  inventory: {
    totalProducts: number;
    lowStock: number;
    outOfStock: number;
    totalQuantity: number;
  };
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [revenue, setRevenue] = useState<{ date: string; revenue: number }[]>([]);
  const [sales, setSales] = useState<{ date: string; online: number; offline: number; total: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminFetch<DashboardStats>("/api/dashboard/stats"),
      adminFetch<{ revenue: typeof revenue; sales: typeof sales }>("/api/dashboard/charts"),
    ]).then(([statsRes, chartsRes]) => {
      if (statsRes.success && statsRes.data) setStats(statsRes.data);
      if (chartsRes.success && chartsRes.data) {
        setRevenue(chartsRes.data.revenue);
        setSales(chartsRes.data.sales);
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to SHOE MAFIA Admin Panel</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Revenue"
          value={formatCurrency(stats?.totalRevenue || 0)}
          subtitle={`Today: ${formatCurrency(stats?.todayRevenue || 0)}`}
          icon={IndianRupee}
        />
        <StatsCard
          title="Orders"
          value={stats?.totalOrders || 0}
          subtitle={`${stats?.todayOrders || 0} today · ${stats?.pendingOrders || 0} pending`}
          icon={ShoppingCart}
        />
        <StatsCard
          title="Products"
          value={stats?.totalProducts || 0}
          subtitle={`${stats?.inventory.totalQuantity || 0} units in stock`}
          icon={Package}
        />
        <StatsCard
          title="Customers"
          value={stats?.totalCustomers || 0}
          icon={Users}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <RevenueChart data={revenue} />
        <SalesChart data={sales} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glass-card border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
              Inventory Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Low Stock</span>
              <span className="font-medium text-yellow-400">{stats?.inventory.lowStock || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Out of Stock</span>
              <span className="font-medium text-red-400">{stats?.inventory.outOfStock || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total SKUs</span>
              <span className="font-medium">{stats?.inventory.totalProducts || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" />
              Pending Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment Verification</span>
              <span className="font-medium">{stats?.pendingPayments || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Review Moderation</span>
              <span className="font-medium">{stats?.pendingReviews || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pending Orders</span>
              <span className="font-medium">{stats?.pendingOrders || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/10">
          <CardHeader>
            <CardTitle className="text-base">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Today&apos;s Revenue</span>
              <span className="font-medium text-primary">{formatCurrency(stats?.todayRevenue || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Today&apos;s Orders</span>
              <span className="font-medium">{stats?.todayOrders || 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
