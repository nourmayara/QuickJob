import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { protectedRoute, fail } from "@/lib/api";
import { recruiterProfileSchema } from "@/lib/recruiter-validation";

const select = { name: true, firstName: true, companyName: true, sector: true, bio: true, city: true, address: true, phone: true, avatarUrl: true } as const;
export const GET = protectedRoute(["RECRUTEUR"], async (_request, _context, user) => NextResponse.json(await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select })));
export const PATCH = protectedRoute(["RECRUTEUR"], async (request, _context, user) => {
  const input = recruiterProfileSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return fail(400, input.error.issues[0].message);
  await prisma.user.update({ where: { id: user.id }, data: input.data });
  return NextResponse.json({ ok: true });
});
