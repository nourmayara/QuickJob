import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { protectedRoute } from "@/lib/api";
export const GET = protectedRoute(["ADMIN"], async () => NextResponse.json(await prisma.mission.findMany({take:100,orderBy:{id:"desc"}})));
