import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { protectedRoute } from "@/lib/api";
import { publicUserSelect } from "@/lib/authorization";
export const GET = protectedRoute(["ADMIN"], async () => NextResponse.json(await prisma.user.findMany({select:publicUserSelect,take:100,orderBy:{id:"asc"}})));
