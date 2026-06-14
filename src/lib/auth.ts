import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { ADMIN_COOKIE, AUTH_COOKIE, JWT_EXPIRY, ADMIN_JWT_EXPIRY } from "./constants";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret-change-in-production-min-32-chars"
);

export interface JWTPayload {
  sub: string;
  role: "admin" | "customer";
  email?: string;
  username?: string;
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
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
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

  const admin = await prisma.admin.findUnique({
    where: { id: payload.sub },
  });

  if (!admin || !admin.isActive) return null;
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
  const envUsername = process.env.ADMIN_USERNAME;
  const envPassword = process.env.ADMIN_PASSWORD;

  let admin = await prisma.admin.findUnique({ where: { username } });
  let authenticated = false;

  if (envUsername && envPassword) {
    authenticated = username === envUsername && password === envPassword;
  }

  if (!authenticated && admin) {
    authenticated = await verifyPassword(password, admin.passwordHash);
  }

  if (!authenticated) {
    return null;
  }

  if (!admin) {
    const passwordHash = await hashPassword(password);
    admin = await prisma.admin.create({
      data: {
        username,
        passwordHash,
        name: "SHOE MAFIA Admin",
      },
    });
  }

  const token = await createToken(
    { sub: admin.id, role: "admin", username: admin.username },
    ADMIN_JWT_EXPIRY
  );

  await prisma.session.create({
    data: {
      token,
      adminId: admin.id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

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
