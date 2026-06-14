import { SignJWT, jwtVerify } from "jose";

const FALLBACK_SECRET = "fallback-secret-change-in-production-min-32-chars";

export function getJwtSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret || secret.length < 16) {
    return new TextEncoder().encode(FALLBACK_SECRET);
  }
  return new TextEncoder().encode(secret);
}

export async function signJwt(
  payload: Record<string, unknown>,
  expiresIn: string
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getJwtSecretKey());
}

export async function verifyJwt(token: string) {
  const { payload } = await jwtVerify(token, getJwtSecretKey());
  return payload;
}
