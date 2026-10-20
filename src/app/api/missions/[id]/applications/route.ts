import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { protectedRoute, idSchema, fail } from "@/lib/api";
import { applicationInput } from "@/lib/worker-validation";
import { applyToMission } from "@/lib/worker-service";
export const GET = protectedRoute(["RECRUTEUR"], async (_request, context, user) => {
  const id = idSchema.safeParse((await context.params).id);
  if(!id.success) return fail(400,"Identifiant invalide");
  if(!await prisma.mission.findFirst({where:{id:id.data,recruiterId:user.id}})) return fail(404,"Mission introuvable");
  return NextResponse.json(await prisma.application.findMany({where:{missionId:id.data,mission:{recruiterId:user.id}},take:100}));
});
export const POST = protectedRoute(["TRAVAILLEUR"], async (request, context, user) => {
  const id = idSchema.safeParse((await context.params).id);
  if(!id.success) return fail(400,"Identifiant invalide");
  const raw = await request.text();
  let body: unknown;
  try { body = raw.trim() ? JSON.parse(raw) : {}; } catch { return fail(400,"Message de candidature invalide"); }
  const input = applicationInput.safeParse(body);
  if (!input.success) return fail(400, input.error.issues[0].message);
  return NextResponse.json(await applyToMission(user.id, id.data, input.data.message), { status: 201 });
});
