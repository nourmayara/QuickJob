import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { protectedRoute } from "@/lib/api";
import { visibleWorkerMission, workerMissionInclude } from "@/lib/worker-data";
export const GET = protectedRoute(["TRAVAILLEUR"], async (_request, _context, user) => NextResponse.json(await prisma.favorite.findMany({ where: { workerId: user.id, mission: visibleWorkerMission(user.id) }, select: { id: true, mission: { include: workerMissionInclude(user.id) } }, orderBy: { createdAt: "desc" } })));
