import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { protectedRoute, idSchema, fail } from "@/lib/api";
export const PATCH = protectedRoute(["ADMIN"], async (request, context) => {
  const id = idSchema.safeParse((await context.params).id);
  const input = z.object({action:z.literal("MODERATE")}).strict().safeParse(await request.json().catch(()=>null));
  if(!id.success || !input.success) return fail(400,"Données invalides");
  await prisma.mission.update({where:{id:id.data},data:{status:"MODERATED"},select:{id:true}});
  return NextResponse.json({ok:true});
});
