import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth";
import { getInventoryStats } from "@/lib/inventory";
import { decimalToNumber } from "@/lib/utils";
import {
  checkRateLimit,
  rateLimited,
  successResponse,
  unauthorized,
} from "@/lib/api";

export async function GET(request: Request) {
  const rl = checkRateLimit(request, "dashboard-stats", 60, 60000);
  if (!rl.success) return rateLimited();

  const admin = await getAdminUser();
  if (!admin) return unauthorized();

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const [
    totalOrders,
    todayOrders,
    monthOrders,
    lastMonthOrders,
    pendingOrders,
    pendingPayments,
    totalProducts,
    totalCustomers,
    revenueAll,
    revenueToday,
    revenueMonth,
    revenueLastMonth,
    inventoryStats,
    recentOrders,
    topProducts,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.order.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.order.count({
      where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
    }),
    prisma.order.count({
      where: { status: { in: ["PENDING", "CONFIRMED", "PACKED"] } },
    }),
    prisma.payment.count({ where: { status: "PENDING_VERIFICATION" } }),
    prisma.product.count({ where: { status: "ACTIVE" } }),
    prisma.customer.count(),
    prisma.order.aggregate({
      _sum: { grandTotal: true },
      where: { status: { notIn: ["CANCELLED", "REFUNDED"] } },
    }),
    prisma.order.aggregate({
      _sum: { grandTotal: true },
      where: {
        createdAt: { gte: startOfToday },
        status: { notIn: ["CANCELLED", "REFUNDED"] },
      },
    }),
    prisma.order.aggregate({
      _sum: { grandTotal: true },
      where: {
        createdAt: { gte: startOfMonth },
        status: { notIn: ["CANCELLED", "REFUNDED"] },
      },
    }),
    prisma.order.aggregate({
      _sum: { grandTotal: true },
      where: {
        createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
        status: { notIn: ["CANCELLED", "REFUNDED"] },
      },
    }),
    getInventoryStats(),
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        items: { take: 2 },
        customer: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true, total: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
  ]);

  const topProductDetails = await prisma.product.findMany({
    where: { id: { in: topProducts.map((p) => p.productId) } },
    select: { id: true, name: true, sku: true, images: { take: 1 } },
  });

  const topProductsWithDetails = topProducts.map((tp) => ({
    ...tp,
    product: topProductDetails.find((p) => p.id === tp.productId),
    totalRevenue: decimalToNumber(tp._sum.total || 0),
    totalSold: tp._sum.quantity || 0,
  }));

  const monthRevenue = decimalToNumber(revenueMonth._sum.grandTotal || 0);
  const lastMonthRevenue = decimalToNumber(revenueLastMonth._sum.grandTotal || 0);
  const revenueGrowth =
    lastMonthRevenue > 0
      ? Math.round(((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
      : 0;

  return successResponse({
    orders: {
      total: totalOrders,
      today: todayOrders,
      thisMonth: monthOrders,
      lastMonth: lastMonthOrders,
      pending: pendingOrders,
    },
    revenue: {
      total: decimalToNumber(revenueAll._sum.grandTotal || 0),
      today: decimalToNumber(revenueToday._sum.grandTotal || 0),
      thisMonth: monthRevenue,
      lastMonth: lastMonthRevenue,
      growthPercent: revenueGrowth,
    },
    products: { active: totalProducts, ...inventoryStats },
    customers: { total: totalCustomers },
    payments: { pendingVerification: pendingPayments },
    recentOrders,
    topProducts: topProductsWithDetails,
  });
}
