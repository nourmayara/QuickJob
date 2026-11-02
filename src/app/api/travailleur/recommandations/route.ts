import { NextResponse } from "next/server";
import { protectedRoute } from "@/lib/api";
import { recommendMissionsForWorker } from "@/lib/matching-service";

export const GET = protectedRoute(["TRAVAILLEUR"], async (request, _context, user) => {
  const limit = Number(new URL(request.url).searchParams.get("limit") ?? 20);
  return NextResponse.json(await recommendMissionsForWorker(user.id, Number.isFinite(limit) ? limit : 20));
});
