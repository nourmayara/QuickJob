import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { protectedRoute, idSchema, fail } from "@/lib/api";
export const GET = protectedRoute(["TRAVAILLEUR","RECRUTEUR"], async (request, _context, user) => {
  const requestedWorker = new URL(request.url).searchParams.get("workerId");
  if(requestedWorker !== null) {
    const id = idSchema.safeParse(requestedWorker);
    if(!id.success) return fail(400,"Identifiant invalide");
    if(user.role !== "TRAVAILLEUR" || id.data !== user.id) return fail(403,"Accès interdit");
  }
  return NextResponse.json(await prisma.application.findMany({where:user.role === "TRAVAILLEUR" ? {workerId:user.id} : {mission:{recruiterId:user.id}},take:100}));
});
