import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { protectedRoute, fail } from "@/lib/api";
import { workerProfileSchema } from "@/lib/worker-validation";

const select = { id: true, name: true, firstName: true, email: true, city: true, skills: true, experience: true, languages: true, bio: true } as const;
export const GET = protectedRoute(["TRAVAILLEUR"], async (_request, _context, user) => NextResponse.json(await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select })));
export const PATCH = protectedRoute(["TRAVAILLEUR"], async (request, _context, user) => {
  const parsed = workerProfileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, parsed.error.issues[0].message);
  return NextResponse.json(await prisma.user.update({ where: { id: user.id }, data: parsed.data, select }));
});
