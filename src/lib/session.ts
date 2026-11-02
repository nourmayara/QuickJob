import prisma from "./prisma";
import { cache } from "react";
import { createHash, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { COOKIE_NAME, MAX_AGE, signToken, verifyToken } from "./token";

export async function createSession(userId: number) {
  const sessionId = randomUUID();
  await prisma.session.create({data:{id:sessionId,userId,expiresAt:new Date(Date.now()+MAX_AGE*1000)}});
  const token = await signToken(userId, sessionId);
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export const getSession = cache(async () => {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;
  const user = await prisma.user.findUnique({where:{id:payload.userId},select:{suspended:true}});
  if (!user || user.suspended) return null;
  const id = payload.sessionId ?? createHash("sha256").update(token).digest("hex");
  const session = payload.sessionId
    ? await prisma.session.findUnique({where:{id}})
    : await prisma.session.upsert({where:{id}, update:{}, create:{id,userId:payload.userId,expiresAt:new Date(payload.exp*1000)}});
  return session && session.userId === payload.userId && session.expiresAt > new Date() ? {userId:session.userId} : null;
});

export async function destroySession() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  const payload = token ? await verifyToken(token) : null;
  if (payload && token && await prisma.user.findUnique({where:{id:payload.userId},select:{id:true}})) {
    const id = payload.sessionId ?? createHash("sha256").update(token).digest("hex");
    await prisma.session.upsert({where:{id},update:{expiresAt:new Date(0)},create:{id,userId:payload.userId,expiresAt:new Date(0)}});
  }
  (await cookies()).delete(COOKIE_NAME);
}
