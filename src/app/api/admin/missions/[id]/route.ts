import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { protectedRoute, idSchema, fail } from "@/lib/api";
import { moderateMission } from "@/lib/admin-service";
export const GET = protectedRoute(["ADMIN"], async (_request, context) => {
  const id = idSchema.safeParse((await context.params).id);
  if (!id.success) return fail(400, "Identifiant invalide");
  const item = await prisma.mission.findUnique({ where: { id: id.data }, include: { recruiter: { select: { id: true, name: true, firstName: true, companyName: true } }, _count: { select: { applications: true } } } });
  return item ? NextResponse.json(item) : fail(404, "Mission introuvable");
});
export const PATCH = protectedRoute(["ADMIN"], async (request, context, admin) => {
  const id = idSchema.safeParse((await context.params).id);
  const input = z.object({ action: z.literal("MODERATE"), reason: z.string().trim().min(10).max(2000).default("Mission masquée par la modération") }).strict().safeParse(await request.json().catch(() => null));
  if (!id.success || !input.success) return fail(400, "Données invalides");
  return NextResponse.json(await moderateMission(admin.id, id.data, input.data.reason));
});
