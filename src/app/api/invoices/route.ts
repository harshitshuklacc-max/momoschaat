import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth";
import { createInvoice } from "@/lib/invoice";
import { createAuditLog } from "@/lib/audit";
import {
  checkRateLimit,
  errorResponse,
  getPaginationParams,
  getRequestMeta,
  notFound,
  parseZodError,
  rateLimited,
  successResponse,
  unauthorized,
} from "@/lib/api";
import type { Prisma } from "@prisma/client";

const invoiceCreateSchema = z.object({
  customerName: z.string().min(1),
  customerPhone: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().optional(),
        name: z.string(),
        sku: z.string(),
        barcode: z.string().optional(),
        quantity: z.coerce.number().int().positive(),
        price: z.coerce.number().positive(),
        discount: z.coerce.number().min(0).default(0),
      })
    )
    .min(1),
  subtotal: z.coerce.number().min(0),
  discount: z.coerce.number().min(0).default(0),
  tax: z.coerce.number().min(0).default(0),
  grandTotal: z.coerce.number().min(0),
  paymentMethod: z.string(),
  orderId: z.string().optional(),
});

export async function GET(request: Request) {
  const rl = checkRateLimit(request, "invoices-list", 60, 60000);
  if (!rl.success) return rateLimited();

  const admin = await getAdminUser();
  if (!admin) return unauthorized();

  const { searchParams } = new URL(request.url);
  const { page, limit, skip } = getPaginationParams(searchParams);

  const where: Prisma.InvoiceWhereInput = {};

  const search = searchParams.get("search");
  if (search) {
    where.OR = [
      { invoiceNumber: { contains: search, mode: "insensitive" } },
      { customerName: { contains: search, mode: "insensitive" } },
    ];
  }

  if (searchParams.get("archived") === "true") {
    where.isArchived = true;
  } else if (searchParams.get("archived") !== "all") {
    where.isArchived = false;
  }

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: { items: true, order: { select: { orderNumber: true } } },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.invoice.count({ where }),
  ]);

  return successResponse({
    invoices,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(request: Request) {
  const rl = checkRateLimit(request, "invoices-create", 20, 60000);
  if (!rl.success) return rateLimited();

  const admin = await getAdminUser();
  if (!admin) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = invoiceCreateSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Validation failed", 400, parseZodError(parsed.error));
  }

  const invoice = await createInvoice(parsed.data);

  const meta = getRequestMeta(request);
  await createAuditLog({
    adminId: admin.id,
    action: "CREATE",
    entity: "invoice",
    entityId: invoice.id,
    details: { invoiceNumber: invoice.invoiceNumber },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return successResponse(invoice, 201);
}
