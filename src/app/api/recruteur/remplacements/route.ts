import { NextResponse } from "next/server";
import { fail, protectedRoute } from "@/lib/api";
import { proposeReplacement } from "@/lib/replacement-service";
import { z } from "zod";
const input = z.object({ cancelledApplicationId: z.number().int().positive(), candidateId: z.number().int().positive() }).strict();
export const POST = protectedRoute(["RECRUTEUR"], async (request, _context, user) => {
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, "Données invalides");
  return NextResponse.json(await proposeReplacement(user.id, parsed.data.cancelledApplicationId, parsed.data.candidateId), { status: 201 });
});
