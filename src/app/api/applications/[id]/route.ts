import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { protectedRoute, idSchema, fail } from "@/lib/api";
import { decideApplication } from "@/lib/recruiter-service";
export const GET = protectedRoute(["TRAVAILLEUR","RECRUTEUR"], async (_request, context, user) => {
  const id = idSchema.safeParse((await context.params).id);
  if(!id.success) return fail(400,"Identifiant invalide");
  const application = await prisma.application.findFirst({where:{id:id.data,...(user.role === "TRAVAILLEUR" ? {workerId:user.id} : {mission:{recruiterId:user.id}})}});
  return application ? NextResponse.json(application) : fail(404,"Candidature introuvable");
});
export const PATCH = protectedRoute(["RECRUTEUR"], async (request, context, user) => {
  const id = idSchema.safeParse((await context.params).id);
  const input = z.object({status:z.enum(["ACCEPTED","REJECTED"])}).strict().safeParse(await request.json().catch(()=>null));
  if(!id.success || !input.success) return fail(400,"Données invalides");
  return NextResponse.json(await decideApplication(user.id, id.data, input.data.status));
});
