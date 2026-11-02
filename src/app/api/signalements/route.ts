import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { protectedRoute, fail } from "@/lib/api";
import { reportInput, listInput } from "@/lib/admin-validation";
import { createReport } from "@/lib/admin-service";
export const POST = protectedRoute(["TRAVAILLEUR", "RECRUTEUR"], async (request, _context, user) => {
  const input = reportInput.safeParse(await request.json().catch(() => null));
  if (!input.success) return fail(400, input.error.issues[0].message);
  return NextResponse.json(await createReport(user, input.data), { status: 201 });
});
export const GET = protectedRoute(["TRAVAILLEUR", "RECRUTEUR"], async (request, _context, user) => {
  const input = listInput.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!input.success) return fail(400, "Page invalide");
  return NextResponse.json(await prisma.report.findMany({ where: { authorId: user.id }, select: { id: true, kind: true, reason: true, status: true, createdAt: true, resolution: true, decidedAt: true }, orderBy: { id: "desc" }, take: 25, skip: (input.data.page - 1) * 25 }));
});
