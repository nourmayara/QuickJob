import { NextResponse } from "next/server";
import { protectedRoute, idSchema, fail } from "@/lib/api";
import { categoryInput } from "@/lib/admin-validation";
import { saveCategory } from "@/lib/category-service";
import { z } from "zod";
export const PATCH = protectedRoute(["ADMIN"], async (request, context, admin) => {
  const id = idSchema.safeParse((await context.params).id);
  const input = categoryInput.extend({ expectedName: z.string(), expectedActive: z.boolean() }).safeParse(await request.json().catch(() => null));
  if (!id.success || !input.success) return fail(400, "Données invalides");
  return NextResponse.json(await saveCategory(admin.id, input.data, id.data));
});
