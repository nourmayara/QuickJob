import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { protectedRoute, missionUpdate, idSchema, fail } from "@/lib/api";
import { updateMission } from "@/lib/recruiter-service";
import { visibleWorkerMission } from "@/lib/worker-data";
export const GET = protectedRoute(["TRAVAILLEUR","RECRUTEUR"], async (_request, context, user) => {
  const id = idSchema.safeParse((await context.params).id);
  if(!id.success) return fail(400,"Identifiant invalide");
  const mission = await prisma.mission.findFirst({where:{id:id.data,...(user.role === "RECRUTEUR" ? {recruiterId:user.id} : visibleWorkerMission(user.id))}});
  return mission ? NextResponse.json(mission) : fail(404,"Mission introuvable");
});
export const PATCH = protectedRoute(["RECRUTEUR"], async (request, context, user) => {
  const id = idSchema.safeParse((await context.params).id);
  const input = missionUpdate.safeParse(await request.json().catch(()=>null));
  if(!id.success || !input.success) return fail(400,"Données invalides");
  await updateMission(user.id, id.data, input.data);
  return NextResponse.json({ok:true});
});
