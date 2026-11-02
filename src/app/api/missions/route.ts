import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { protectedRoute, missionInput, fail } from "@/lib/api";
import { createMission } from "@/lib/recruiter-service";
import { workerSearchSchema } from "@/lib/worker-validation";
import { workerSearchWhere } from "@/lib/worker-data";

export const GET = protectedRoute(["TRAVAILLEUR","RECRUTEUR"], async (_request, _context, user) => {
  const input = workerSearchSchema.safeParse(Object.fromEntries(new URL(_request.url).searchParams));
  if (user.role === "TRAVAILLEUR" && !input.success) return fail(400, input.error.issues[0].message);
  const missions = await prisma.mission.findMany({where:user.role === "RECRUTEUR" ? {recruiterId:user.id} : workerSearchWhere(input.data!),orderBy:{id:"desc"},take:user.role === "RECRUTEUR" ? 100 : 20,skip:user.role === "TRAVAILLEUR" ? ((input.data?.page ?? 1) - 1) * 20 : 0});
  return NextResponse.json(missions);
});
export const POST = protectedRoute(["RECRUTEUR"], async (request, _context, user) => {
  const input = missionInput.safeParse(await request.json().catch(()=>null));
  if (!input.success) return fail(400, input.error.issues[0].message);
  return NextResponse.json(await createMission(user.id, input.data),{status:201});
});
