import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getAuthUser();

    if (!user || !user.customer) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.customer.firstName,
        lastName: user.customer.lastName,
        phone: user.customer.phone,
        avatar: user.customer.avatar,
        createdAt: user.customer.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Auth me error:", error);
    return NextResponse.json({ error: "Failed to get user" }, { status: 500 });
  }
}
