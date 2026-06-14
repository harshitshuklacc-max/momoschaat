import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth";
import { decimalToNumber } from "@/lib/utils";
import {
  checkRateLimit,
  rateLimited,
  successResponse,
  unauthorized,
} from "@/lib/api";

function getDateRange(period: string) {
  const now = new Date();
  const ranges: Record<string, { from: Date; to: Date; groupBy: "day" | "month" }> = {
    "7d": {
      from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      to: now,
      groupBy: "day",
    },
    "30d": {
      from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      to: now,
      groupBy: "day",
    },
    "90d": {
      from: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
      to: now,
      groupBy: "day",
    },
    "12m": {
      from: new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()),
      to: now,
      groupBy: "month",
    },
  };

  return ranges[period] || ranges["30d"];
}

export async function GET(request: Request) {
  const rl = checkRateLimit(request, "dashboard-charts", 60, 60000);
  if (!rl.success) return rateLimited();

  const admin = await getAdminUser();
  if (!admin) return unauthorized();

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "30d";
  const { from, to } = getDateRange(period);

  const orders = await prisma.order.findMany({
    where: {
      createdAt: { gte: from, lte: to },
      status: { notIn: ["CANCELLED", "REFUNDED"] },
    },
    select: {
      createdAt: true,
      grandTotal: true,
      type: true,
      status: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const revenueMap = new Map<string, { revenue: number; orders: number }>();
  const typeMap = new Map<string, number>();
  const statusMap = new Map<string, number>();

  for (const order of orders) {
    const dateKey = order.createdAt.toISOString().slice(0, 10);
    const existing = revenueMap.get(dateKey) || { revenue: 0, orders: 0 };
    existing.revenue += decimalToNumber(order.grandTotal);
    existing.orders += 1;
    revenueMap.set(dateKey, existing);

    typeMap.set(order.type, (typeMap.get(order.type) || 0) + 1);
    statusMap.set(order.status, (statusMap.get(order.status) || 0) + 1);
  }

  const revenueChart = Array.from(revenueMap.entries())
    .map(([date, data]) => ({
      date,
      revenue: Math.round(data.revenue),
      orders: data.orders,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const salesByType = Array.from(typeMap.entries()).map(([type, count]) => ({
    type,
    count,
  }));

  const ordersByStatus = Array.from(statusMap.entries()).map(([status, count]) => ({
    status,
    count,
  }));

  const categorySales = await prisma.orderItem.groupBy({
    by: ["productId"],
    _sum: { total: true, quantity: true },
    where: {
      order: {
        createdAt: { gte: from, lte: to },
        status: { notIn: ["CANCELLED", "REFUNDED"] },
      },
    },
    orderBy: { _sum: { total: "desc" } },
    take: 10,
  });

  const products = await prisma.product.findMany({
    where: { id: { in: categorySales.map((c) => c.productId) } },
    select: {
      id: true,
      name: true,
      category: { select: { name: true } },
    },
  });

  const topSelling = categorySales.map((cs) => {
    const product = products.find((p) => p.id === cs.productId);
    return {
      productId: cs.productId,
      name: product?.name || "Unknown",
      category: product?.category.name || "Unknown",
      revenue: decimalToNumber(cs._sum.total || 0),
      quantity: cs._sum.quantity || 0,
    };
  });

  return successResponse({
    period,
    from: from.toISOString(),
    to: to.toISOString(),
    revenueChart,
    salesByType,
    ordersByStatus,
    topSelling,
    totals: {
      revenue: revenueChart.reduce((sum, d) => sum + d.revenue, 0),
      orders: orders.length,
    },
  });
}
