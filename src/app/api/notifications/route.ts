import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authorization";
import prisma from "@/lib/prisma";
export async function GET() {
 const auth=await requireRole();
 if(auth.response) return auth.response;
 return NextResponse.json(await prisma.notification.findMany({where:{userId:auth.user.id},select:{id:true,message:true,createdAt:true},orderBy:{createdAt:"desc"},take:20}),{headers:{"Cache-Control":"no-store"}});
}
