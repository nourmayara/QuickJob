import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { protectedRoute } from "@/lib/api";
export const GET = protectedRoute(["ADMIN"], async () => {
  const [users,missions,applications,suspended] = await prisma.$transaction([prisma.user.count(),prisma.mission.count(),prisma.application.count(),prisma.user.count({where:{suspended:true}})]);
  return NextResponse.json({users,missions,applications,suspended});
});
