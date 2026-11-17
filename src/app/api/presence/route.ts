import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { protectedRoute } from "@/lib/api";

export const POST = protectedRoute(["TRAVAILLEUR", "RECRUTEUR"], async (_request, _context, user) => {
  const lastSeenAt = new Date();
  await prisma.user.update({ where: { id: user.id }, data: { lastSeenAt }, select: { id: true } });
  return NextResponse.json({ lastSeenAt: lastSeenAt.toISOString() }, { headers: { "Cache-Control": "no-store" } });
});
