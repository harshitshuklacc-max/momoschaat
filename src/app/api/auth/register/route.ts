import { NextRequest, NextResponse } from "next/server";
import { customerRegister } from "@/lib/auth";
import { registerSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const user = await customerRegister(parsed.data);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.customer?.firstName,
        lastName: user.customer?.lastName,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Registration failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
