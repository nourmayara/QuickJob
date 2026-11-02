import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { protectedRoute, fail, idSchema } from "@/lib/api";
import { availabilityInput } from "@/lib/schedule-time";
import { saveAvailability } from "@/lib/schedule-service";
export const PATCH = protectedRoute(["TRAVAILLEUR"], async (request, context, user) => {
  const id = idSchema.safeParse((await context.params).id);
  const input = availabilityInput.safeParse(await request.json().catch(() => null));
  if (!id.success) return fail(400, "Identifiant invalide");
  if (!input.success) return fail(400, input.error.issues[0].message);
  return NextResponse.json(await saveAvailability(user.id, input.data, id.data));
});
export const DELETE = protectedRoute(["TRAVAILLEUR"], async (_request, context, user) => {
  const id = idSchema.safeParse((await context.params).id);
  if (!id.success) return fail(400, "Identifiant invalide");
  const result = await prisma.availability.deleteMany({ where: { id: id.data, workerId: user.id } });
  return result.count ? NextResponse.json({ ok: true }) : fail(404, "Créneau introuvable");
});
