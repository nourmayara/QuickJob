import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { protectedRoute, fail } from "@/lib/api";
const select = {id:true,name:true,firstName:true,phone:true,city:true,recruiterType:true,companyName:true,email:true,role:true} as const;
const input = z.object({name:z.string().trim().min(2).max(80).optional(),firstName:z.string().trim().min(1).max(80).optional(),phone:z.string().trim().regex(/^\+?[\d\s().-]{8,20}$/).optional(),city:z.string().trim().max(100).optional()}).strict().refine(data => Object.keys(data).length > 0);
export const GET = protectedRoute(["TRAVAILLEUR","RECRUTEUR"], async (_request,_context,user) => NextResponse.json(await prisma.user.findUnique({where:{id:user.id},select})));
export const PATCH = protectedRoute(["TRAVAILLEUR","RECRUTEUR"], async (request,_context,user) => {
  const parsed = input.safeParse(await request.json().catch(()=>null));
  if(!parsed.success) return fail(400,"Profil invalide");
  return NextResponse.json(await prisma.user.update({where:{id:user.id},data:parsed.data,select}));
});
