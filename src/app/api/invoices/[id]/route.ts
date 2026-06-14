import { prisma } from "@/lib/prisma";
import { getAdminUser, getAuthUser } from "@/lib/auth";
import {
  checkRateLimit,
  notFound,
  rateLimited,
  successResponse,
  unauthorized,
} from "@/lib/api";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = checkRateLimit(request, "invoices-detail", 60, 60000);
  if (!rl.success) return rateLimited();

  const { id } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      items: true,
      order: {
        include: {
          customer: true,
        },
      },
    },
  });

  if (!invoice) return notFound("Invoice not found");

  const admin = await getAdminUser();
  if (!admin) {
    const user = await getAuthUser();
    if (!user?.customer) return unauthorized();

    const orderCustomerId = invoice.order?.customerId;
    if (orderCustomerId && orderCustomerId !== user.customer.id) {
      return unauthorized();
    }
  }

  return successResponse(invoice);
}
