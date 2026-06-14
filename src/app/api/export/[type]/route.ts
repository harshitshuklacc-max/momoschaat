import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { decimalToNumber, formatDate } from "@/lib/utils";
import {
  checkRateLimit,
  errorResponse,
  getRequestMeta,
  rateLimited,
  unauthorized,
} from "@/lib/api";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";

const VALID_TYPES = ["products", "orders", "inventory", "invoices", "customers"] as const;
const VALID_FORMATS = ["csv", "excel", "pdf"] as const;

type ExportType = (typeof VALID_TYPES)[number];
type ExportFormat = (typeof VALID_FORMATS)[number];

async function fetchExportData(type: ExportType): Promise<Record<string, unknown>[]> {
  switch (type) {
    case "products": {
      const products = await prisma.product.findMany({
        include: {
          brand: { select: { name: true } },
          category: { select: { name: true } },
          inventory: { select: { quantity: true } },
        },
        orderBy: { name: "asc" },
      });
      return products.map((p) => ({
        Name: p.name,
        SKU: p.sku,
        Brand: p.brand.name,
        Category: p.category.name,
        MRP: decimalToNumber(p.mrp),
        "Selling Price": decimalToNumber(p.sellingPrice),
        Stock: p.inventory?.quantity ?? 0,
        Status: p.status,
        Gender: p.gender,
      }));
    }
    case "orders": {
      const orders = await prisma.order.findMany({
        include: { items: true },
        orderBy: { createdAt: "desc" },
      });
      return orders.map((o) => ({
        "Order Number": o.orderNumber,
        Customer: o.customerName,
        Phone: o.customerPhone,
        Type: o.type,
        Status: o.status,
        Subtotal: decimalToNumber(o.subtotal),
        Discount: decimalToNumber(o.discount),
        Total: decimalToNumber(o.grandTotal),
        "Payment Method": o.paymentMethod,
        Date: formatDate(o.createdAt),
        Items: o.items.length,
      }));
    }
    case "inventory": {
      const inventories = await prisma.inventory.findMany({
        include: {
          product: { select: { name: true, sku: true, status: true } },
        },
        orderBy: { updatedAt: "desc" },
      });
      return inventories.map((i) => ({
        Product: i.product.name,
        SKU: i.product.sku,
        Quantity: i.quantity,
        Reserved: i.reserved,
        "Min Stock": i.minStock,
        Status: i.product.status,
      }));
    }
    case "invoices": {
      const invoices = await prisma.invoice.findMany({
        include: { items: true },
        orderBy: { createdAt: "desc" },
      });
      return invoices.map((inv) => ({
        "Invoice Number": inv.invoiceNumber,
        Customer: inv.customerName,
        Phone: inv.customerPhone,
        Subtotal: decimalToNumber(inv.subtotal),
        Discount: decimalToNumber(inv.discount),
        Total: decimalToNumber(inv.grandTotal),
        "Payment Method": inv.paymentMethod,
        Date: formatDate(inv.createdAt),
        Items: inv.items.length,
      }));
    }
    case "customers": {
      const customers = await prisma.customer.findMany({
        include: { user: { select: { email: true, isActive: true } } },
        orderBy: { createdAt: "desc" },
      });
      return customers.map((c) => ({
        "First Name": c.firstName,
        "Last Name": c.lastName,
        Email: c.user.email,
        Phone: c.phone,
        Active: c.user.isActive ? "Yes" : "No",
        "Joined Date": formatDate(c.createdAt),
      }));
    }
  }
}

function buildCsv(rows: Record<string, unknown>[]) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h];
          const str = val === null || val === undefined ? "" : String(val);
          return `"${str.replace(/"/g, '""')}"`;
        })
        .join(",")
    ),
  ];
  return lines.join("\n");
}

function buildExcel(rows: Record<string, unknown>[], type: string) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, type);
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

function buildPdf(rows: Record<string, unknown>[], title: string) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(16);
  doc.text(`SHOE MAFIA - ${title}`, 14, 15);
  doc.setFontSize(8);

  if (rows.length === 0) {
    doc.text("No data available", 14, 25);
    return Buffer.from(doc.output("arraybuffer"));
  }

  const headers = Object.keys(rows[0]);
  let y = 25;
  const lineHeight = 6;
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFont("helvetica", "bold");
  doc.text(headers.join(" | "), 14, y);
  doc.setFont("helvetica", "normal");
  y += lineHeight;

  for (const row of rows.slice(0, 200)) {
    if (y > pageHeight - 10) {
      doc.addPage();
      y = 15;
    }
    const line = headers.map((h) => String(row[h] ?? "")).join(" | ");
    const truncated = line.length > 120 ? line.slice(0, 117) + "..." : line;
    doc.text(truncated, 14, y);
    y += lineHeight;
  }

  if (rows.length > 200) {
    doc.text(`... and ${rows.length - 200} more rows`, 14, y + 4);
  }

  return Buffer.from(doc.output("arraybuffer"));
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  const rl = checkRateLimit(request, "export", 10, 60000);
  if (!rl.success) return rateLimited();

  const admin = await getAdminUser();
  if (!admin) return unauthorized();

  const { type } = await params;
  const { searchParams } = new URL(request.url);
  const format = (searchParams.get("format") || "csv") as ExportFormat;

  if (!VALID_TYPES.includes(type as ExportType)) {
    return errorResponse(
      `Invalid export type. Valid types: ${VALID_TYPES.join(", ")}`,
      400
    );
  }

  if (!VALID_FORMATS.includes(format)) {
    return errorResponse(
      `Invalid format. Valid formats: ${VALID_FORMATS.join(", ")}`,
      400
    );
  }

  const exportType = type as ExportType;
  const rows = await fetchExportData(exportType);
  const filename = `shoe-mafia-${exportType}-${new Date().toISOString().slice(0, 10)}`;

  const meta = getRequestMeta(request);
  await createAuditLog({
    adminId: admin.id,
    action: "EXPORT",
    entity: exportType,
    details: { format, rowCount: rows.length },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  if (format === "csv") {
    const csv = buildCsv(rows);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.csv"`,
      },
    });
  }

  if (format === "excel") {
    const buffer = buildExcel(rows, exportType);
    return new Response(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
      },
    });
  }

  const pdfBuffer = buildPdf(rows, exportType);
  return new Response(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}.pdf"`,
    },
  });
}
