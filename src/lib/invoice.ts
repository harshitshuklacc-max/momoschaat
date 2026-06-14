import { prisma } from "./prisma";
import { STORE } from "./constants";
import { generateInvoiceNumber } from "./utils";
import type { PaymentMethod } from "@prisma/client";

interface InvoiceItemInput {
  productId?: string;
  name: string;
  sku: string;
  barcode?: string;
  quantity: number;
  price: number;
  discount?: number;
}

export async function createInvoice(data: {
  orderId?: string;
  customerName: string;
  customerPhone?: string;
  items: InvoiceItemInput[];
  subtotal: number;
  discount?: number;
  tax?: number;
  grandTotal: number;
  paymentMethod: PaymentMethod | string;
}) {
  const invoiceNumber = generateInvoiceNumber();

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      orderId: data.orderId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      subtotal: data.subtotal,
      discount: data.discount || 0,
      tax: data.tax || 0,
      grandTotal: data.grandTotal,
      paymentMethod: data.paymentMethod,
      storeName: STORE.name,
      storeAddress: STORE.fullAddress,
      storePhone: STORE.phone,
      items: {
        create: data.items.map((item) => ({
          productId: item.productId,
          name: item.name,
          sku: item.sku,
          barcode: item.barcode,
          quantity: item.quantity,
          price: item.price,
          discount: item.discount || 0,
          total: item.price * item.quantity - (item.discount || 0),
        })),
      },
    },
    include: { items: true },
  });

  return invoice;
}

export async function archiveOldInvoices(retentionDays: number = 365) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);

  return prisma.invoice.updateMany({
    where: {
      createdAt: { lt: cutoff },
      isArchived: false,
    },
    data: { isArchived: true },
  });
}
