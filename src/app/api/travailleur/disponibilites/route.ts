import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { protectedRoute, fail } from "@/lib/api";
import { availabilityInput } from "@/lib/schedule-time";
import { saveAvailability } from "@/lib/schedule-service";
export const GET = protectedRoute(["TRAVAILLEUR"], async (_request, _context, user) => NextResponse.json(await prisma.availability.findMany({ where: { workerId: user.id }, orderBy: { startAt: "asc" } })));
export const POST = protectedRoute(["TRAVAILLEUR"], async (request, _context, user) => {
  const input = availabilityInput.safeParse(await request.json().catch(() => null));
  if (!input.success) return fail(400, input.error.issues[0].message);
  return NextResponse.json(await saveAvailability(user.id, input.data), { status: 201 });
});
