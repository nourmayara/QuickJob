import { jwtVerify, SignJWT } from "jose";

export const COOKIE_NAME = "session";
export const MAX_AGE = 60 * 60 * 24 * 7;

function secret() {
  const key = new TextEncoder().encode(process.env.JWT_SECRET);
  if (key.length < 32) throw new Error("JWT_SECRET doit contenir au moins 32 octets");
  return key;
}

export async function signToken(userId: number, sessionId?: string) {
  return new SignJWT({ userId, ...(sessionId ? { sessionId } : {}) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (typeof payload.userId !== "number" || !Number.isSafeInteger(payload.userId) || payload.userId <= 0 || typeof payload.exp !== "number") return null;
    return { userId: payload.userId, sessionId: typeof payload.sessionId === "string" ? payload.sessionId : null, exp: payload.exp };
  } catch {
    return null;
  }
}
