import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { protectedRoute, idSchema, fail } from "@/lib/api";
import { reportDecisionInput } from "@/lib/admin-validation";
import { decideReport, reportInclude } from "@/lib/admin-service";
export const GET = protectedRoute(["ADMIN"], async (_request, context) => {
  const id = idSchema.safeParse((await context.params).id);
  if (!id.success) return fail(400, "Identifiant invalide");
  const report = await prisma.report.findUnique({ where: { id: id.data }, include: reportInclude });
  return report ? NextResponse.json(report) : fail(404, "Signalement introuvable");
});
export const PATCH = protectedRoute(["ADMIN"], async (request, context, admin) => {
  const id = idSchema.safeParse((await context.params).id), input = reportDecisionInput.safeParse(await request.json().catch(() => null));
  if (!id.success) return fail(400, "Identifiant invalide");
  if (!input.success) return fail(400, input.error.issues[0].message);
  return NextResponse.json(await decideReport(admin.id, id.data, input.data));
});
