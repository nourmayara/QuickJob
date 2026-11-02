import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { protectedRoute, idSchema, fail } from "@/lib/api";
import { adminUserSelect, setSuspension } from "@/lib/admin-service";
export const GET = protectedRoute(["ADMIN"], async (_request, context) => {
  const id = idSchema.safeParse((await context.params).id);
  if (!id.success) return fail(400, "Identifiant invalide");
  const item = await prisma.user.findUnique({ where: { id: id.data }, select: adminUserSelect });
  return item ? NextResponse.json(item) : fail(404, "Utilisateur introuvable");
});
export const PATCH = protectedRoute(["ADMIN"], async (request, context, user) => {
  const id = idSchema.safeParse((await context.params).id);
  const input = z.object({suspended:z.boolean()}).strict().safeParse(await request.json().catch(()=>null));
  if(!id.success || !input.success) return fail(400,"Données invalides");
  return NextResponse.json(await setSuspension(user.id, id.data, input.data.suspended));
});
