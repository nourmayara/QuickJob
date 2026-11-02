import { NextResponse } from "next/server";
import { fail, idSchema, protectedRoute } from "@/lib/api";
import { respondToReplacement } from "@/lib/replacement-service";
import { z } from "zod";
const input = z.object({ status: z.enum(["ACCEPTED", "DECLINED"]) }).strict();
export const PATCH = protectedRoute(["TRAVAILLEUR"], async (request, context, user) => {
  const id = idSchema.safeParse((await context.params).id), parsed = input.safeParse(await request.json().catch(() => null));
  if (!id.success || !parsed.success) return fail(400, "Données invalides");
  return NextResponse.json(await respondToReplacement(user.id, id.data, parsed.data.status));
});
