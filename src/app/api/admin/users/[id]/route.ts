import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { protectedRoute, idSchema, fail } from "@/lib/api";
export const PATCH = protectedRoute(["ADMIN"], async (request, context, user) => {
  const id = idSchema.safeParse((await context.params).id);
  const input = z.object({suspended:z.boolean()}).strict().safeParse(await request.json().catch(()=>null));
  if(!id.success || !input.success) return fail(400,"Données invalides");
  if(id.data === user.id) return fail(403,"Auto-suspension interdite");
  await prisma.$transaction(async tx => {
    await tx.user.update({where:{id:id.data},data:input.data,select:{id:true}});
    if(input.data.suspended) await tx.session.updateMany({where:{userId:id.data},data:{expiresAt:new Date(0)}});
  });
  return NextResponse.json({ok:true});
});
