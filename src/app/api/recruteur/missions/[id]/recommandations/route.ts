import { NextResponse } from "next/server";
import { fail, idSchema, protectedRoute } from "@/lib/api";
import { recommendWorkersForMission } from "@/lib/matching-service";

export const GET = protectedRoute(["RECRUTEUR"], async (request, context, user) => {
  const id = idSchema.safeParse((await context.params).id);
  if (!id.success) return fail(400, "Identifiant invalide");
  const requestedLimit = Number(new URL(request.url).searchParams.get("limit") ?? 20);
  const recommendations = await recommendWorkersForMission(user.id, id.data, Number.isFinite(requestedLimit) ? requestedLimit : 20);
  return recommendations ? NextResponse.json(recommendations) : fail(404, "Mission introuvable");
});
