import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { protectedRoute, idSchema, fail } from "@/lib/api";
import { publishedMissionWhere } from "@/lib/worker-data";
// The URL identifies the mission; the worker identity always comes from the session.
export const PUT = protectedRoute(["TRAVAILLEUR"], async (_request, context, user) => {
  const id = idSchema.safeParse((await context.params).id);
  if (!id.success) return fail(400, "Identifiant invalide");
  if (!await prisma.mission.findFirst({ where: { id: id.data, ...publishedMissionWhere }, select: { id: true } })) return fail(404, "Mission indisponible");
  await prisma.favorite.upsert({ where: { workerId_missionId: { workerId: user.id, missionId: id.data } }, update: {}, create: { workerId: user.id, missionId: id.data } });
  return NextResponse.json({ ok: true });
});
export const DELETE = protectedRoute(["TRAVAILLEUR"], async (_request, context, user) => {
  const id = idSchema.safeParse((await context.params).id);
  if (!id.success) return fail(400, "Identifiant invalide");
  await prisma.favorite.deleteMany({ where: { workerId: user.id, missionId: id.data } });
  return NextResponse.json({ ok: true });
});
