import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { protectedRoute, fail } from "@/lib/api";
import { recruiterProfileSchema } from "@/lib/recruiter-validation";

export const PATCH = protectedRoute(["RECRUTEUR"], async (request, _context, user) => {
  const input = recruiterProfileSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return fail(400, input.error.issues[0].message);
  await prisma.user.update({ where: { id: user.id }, data: input.data });
  return NextResponse.json({ ok: true });
});
