import { NextRequest, NextResponse } from "next/server";
import { requireCustomer } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const profileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
});

export async function GET() {
  try {
    const { user, customer } = await requireCustomer();

    const orderCount = await prisma.order.count({
      where: { customerId: customer.id },
    });

    const wishlistCount = await prisma.wishlist.count({
      where: { customerId: customer.id },
    });

    return NextResponse.json({
      profile: {
        id: customer.id,
        email: user.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        avatar: customer.avatar,
        createdAt: customer.createdAt.toISOString(),
        orderCount,
        wishlistCount,
      },
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { customer } = await requireCustomer();
    const body = await request.json();
    const parsed = profileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const updated = await prisma.customer.update({
      where: { id: customer.id },
      data: parsed.data,
    });

    return NextResponse.json({
      profile: {
        id: updated.id,
        firstName: updated.firstName,
        lastName: updated.lastName,
        phone: updated.phone,
        avatar: updated.avatar,
      },
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
