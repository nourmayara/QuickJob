import { NextResponse } from "next/server";
import { protectedRoute, idSchema, fail } from "@/lib/api";
import { reviewInput } from "@/lib/communication-validation";
import { reviewData, createReview } from "@/lib/communication-service";
export const GET = protectedRoute(["TRAVAILLEUR", "RECRUTEUR"], async (_request, context, user) => {
  const id = idSchema.safeParse((await context.params).id);
  if (!id.success) return fail(400, "Identifiant invalide");
  return NextResponse.json(await reviewData(user, id.data), { headers: { "Cache-Control": "no-store" } });
});
export const POST = protectedRoute(["TRAVAILLEUR", "RECRUTEUR"], async (request, context, user) => {
  const id = idSchema.safeParse((await context.params).id);
  const input = reviewInput.safeParse(await request.json().catch(() => null));
  if (!id.success) return fail(400, "Identifiant invalide");
  if (!input.success) return fail(400, input.error.issues[0].message);
  return NextResponse.json(await createReview(user, id.data, input.data), { status: 201 });
});
