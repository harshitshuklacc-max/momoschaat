import { prisma } from "@/lib/prisma";
import { withAdmin } from "@/lib/api-auth";
import { jsonError } from "@/lib/api-response";
import { decimalToNumber, formatCurrency, formatDateTime } from "@/lib/utils";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await withAdmin(async () => true);
  if (adminCheck instanceof Response) return adminCheck;

  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { items: true, order: { select: { orderNumber: true } } },
  });

  if (!invoice) return jsonError("Invoice not found", 404);

  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  let y = 20;

  doc.setFontSize(18);
  doc.text(invoice.storeName, 20, y);
  y += 8;
  doc.setFontSize(10);
  doc.text(invoice.storeAddress, 20, y);
  y += 6;
  doc.text(`Phone: ${invoice.storePhone}`, 20, y);
  y += 12;

  doc.setFontSize(14);
  doc.text(`Invoice: ${invoice.invoiceNumber}`, 20, y);
  y += 8;
  doc.setFontSize(10);
  doc.text(`Date: ${formatDateTime(invoice.createdAt)}`, 20, y);
  y += 6;
  doc.text(`Customer: ${invoice.customerName}`, 20, y);
  if (invoice.customerPhone) {
    y += 6;
    doc.text(`Phone: ${invoice.customerPhone}`, 20, y);
  }
  y += 10;

  doc.setFontSize(11);
  doc.text("Item", 20, y);
  doc.text("Qty", 100, y);
  doc.text("Price", 130, y);
  doc.text("Total", 160, y);
  y += 6;
  doc.line(20, y, 190, y);
  y += 8;

  for (const item of invoice.items) {
    doc.text(item.name.substring(0, 40), 20, y);
    doc.text(String(item.quantity), 100, y);
    doc.text(formatCurrency(decimalToNumber(item.price)), 130, y);
    doc.text(formatCurrency(decimalToNumber(item.total)), 160, y);
    y += 8;
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  }

  y += 6;
  doc.line(20, y, 190, y);
  y += 10;
  doc.text(`Subtotal: ${formatCurrency(decimalToNumber(invoice.subtotal))}`, 130, y);
  y += 6;
  if (decimalToNumber(invoice.discount) > 0) {
    doc.text(`Discount: -${formatCurrency(decimalToNumber(invoice.discount))}`, 130, y);
    y += 6;
  }
  if (decimalToNumber(invoice.tax) > 0) {
    doc.text(`Tax: ${formatCurrency(decimalToNumber(invoice.tax))}`, 130, y);
    y += 6;
  }
  doc.setFontSize(12);
  doc.text(`Total: ${formatCurrency(decimalToNumber(invoice.grandTotal))}`, 130, y);
  y += 8;
  doc.setFontSize(10);
  doc.text(`Payment: ${invoice.paymentMethod}`, 130, y);

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
  return new Response(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoice.invoiceNumber}.pdf"`,
    },
  });
}
