import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { ADMIN_COOKIE, AUTH_COOKIE, JWT_EXPIRY, ADMIN_JWT_EXPIRY } from "./constants";
import { signJwt, verifyJwt } from "./jwt";

export interface JWTPayload {
  sub: string;
  role: "admin" | "customer";
  email?: string;
  username?: string;
}

async function withDbTimeout<T>(promise: Promise<T>, ms = 10000): Promise<T | null> {
  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
    ]);
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createToken(
  payload: JWTPayload,
  expiresIn: string = JWT_EXPIRY
): Promise<string> {
  return signJwt({ ...payload }, expiresIn);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const payload = await verifyJwt(token);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function setAuthCookie(token: string, isAdmin = false) {
  const cookieStore = await cookies();
  cookieStore.set(isAdmin ? ADMIN_COOKIE : AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: isAdmin ? 60 * 60 * 24 : 60 * 60 * 24 * 7,
    path: "/",
  });
}

export async function clearAuthCookie(isAdmin = false) {
  const cookieStore = await cookies();
  cookieStore.delete(isAdmin ? ADMIN_COOKIE : AUTH_COOKIE);
}

export async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload || payload.role !== "customer") return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: { customer: true },
  });

  if (!user || !user.isActive) return null;
  return user;
}

export async function getAdminUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload || payload.role !== "admin") return null;

  const admin = await withDbTimeout(
    prisma.admin.findUnique({
      where: { id: payload.sub },
    })
  );

  if (!admin || !admin.isActive) {
    // Allow JWT-only access when DB is temporarily unavailable
    if (payload.username) {
      return {
        id: payload.sub,
        username: payload.username,
        passwordHash: "",
        name: "SHOE MAFIA Admin",
        email: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    return null;
  }

  return admin;
}

export async function requireAdmin() {
  const admin = await getAdminUser();
  if (!admin) {
    throw new Error("Unauthorized");
  }
  return admin;
}

export async function requireCustomer() {
  const user = await getAuthUser();
  if (!user || !user.customer) {
    throw new Error("Unauthorized");
  }
  return { user, customer: user.customer };
}

export async function authenticateAdmin(username: string, password: string) {
  const normalizedUsername = username.trim();
  const envUsername = process.env.ADMIN_USERNAME?.trim();
  const envPassword = process.env.ADMIN_PASSWORD;

  let authenticated = false;

  if (envUsername && envPassword) {
    authenticated =
      normalizedUsername.toLowerCase() === envUsername.toLowerCase() &&
      password === envPassword;
  }

  let admin = await withDbTimeout(
    prisma.admin.findFirst({
      where: {
        username: { equals: normalizedUsername, mode: "insensitive" },
      },
    })
  );

  if (!authenticated && admin) {
    authenticated = await verifyPassword(password, admin.passwordHash);
  }

  if (!authenticated) {
    return null;
  }

  if (!admin) {
    const passwordHash = await hashPassword(password);
    admin = await withDbTimeout(
      prisma.admin.create({
        data: {
          username: envUsername || normalizedUsername,
          passwordHash,
          name: "SHOE MAFIA Admin",
        },
      })
    );

    if (!admin) {
      throw new Error(
        "Could not connect to database. Verify DATABASE_URL on Vercel and Neon is active."
      );
    }
  }

  const token = await createToken(
    { sub: admin.id, role: "admin", username: admin.username },
    ADMIN_JWT_EXPIRY
  );

  try {
    await withDbTimeout(
      prisma.session.create({
        data: {
          token,
          adminId: admin.id,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      }),
      5000
    );
  } catch {
    // Session logging is optional — login still succeeds
  }

  return { admin, token };
}

export async function adminLogin(username: string, password: string) {
  const result = await authenticateAdmin(username, password);
  if (!result) return null;

  await setAuthCookie(result.token, true);
  return result.admin;
}

export async function customerRegister(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}) {
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });
  if (existing) throw new Error("Email already registered");

  const passwordHash = await hashPassword(data.password);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      role: "CUSTOMER",
      customer: {
        create: {
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
        },
      },
    },
    include: { customer: true },
  });

  const token = await createToken({
    sub: user.id,
    role: "customer",
    email: user.email,
  });

  await prisma.session.create({
    data: {
      token,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  await setAuthCookie(token);
  return user;
}

export async function customerLogin(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { customer: true },
  });

  if (!user || !user.isActive) return null;

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;

  const token = await createToken({
    sub: user.id,
    role: "customer",
    email: user.email,
  });

  await prisma.session.create({
    data: {
      token,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  await setAuthCookie(token);
  return user;
}

export async function logout(isAdmin = false) {
  const cookieStore = await cookies();
  const token = cookieStore.get(isAdmin ? ADMIN_COOKIE : AUTH_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token } });
  }
  await clearAuthCookie(isAdmin);
}
