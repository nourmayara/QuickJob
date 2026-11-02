import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { protectedRoute, idSchema, fail } from "@/lib/api";
import { messageInput } from "@/lib/communication-validation";
import { participantApplication, threadMessages, sendMessage } from "@/lib/communication-service";
export const GET = protectedRoute(["TRAVAILLEUR", "RECRUTEUR"], async (request, context, user) => {
  const id = idSchema.safeParse((await context.params).id);
  const raw = new URL(request.url).searchParams.get("before");
  const before = raw === null ? undefined : idSchema.safeParse(raw);
  if (!id.success || (before && !before.success)) return fail(400, "Identifiant invalide");
  return NextResponse.json(await threadMessages(user, id.data, before?.data), { headers: { "Cache-Control": "no-store" } });
});
export const POST = protectedRoute(["TRAVAILLEUR", "RECRUTEUR"], async (request, context, user) => {
  const id = idSchema.safeParse((await context.params).id);
  const input = messageInput.safeParse(await request.json().catch(() => null));
  if (!id.success) return fail(400, "Identifiant invalide");
  if (!input.success) return fail(400, input.error.issues[0].message);
  return NextResponse.json(await sendMessage(user, id.data, input.data.body), { status: 201 });
});
export const PATCH = protectedRoute(["TRAVAILLEUR", "RECRUTEUR"], async (request, context, user) => {
  const id = idSchema.safeParse((await context.params).id);
  const input = z.object({ ids: z.array(z.number().int().positive()).min(1).max(50) }).strict().safeParse(await request.json().catch(() => null));
  if (!id.success || !input.success) return fail(400, "Données invalides");
  await participantApplication(prisma, user, id.data);
  await prisma.message.updateMany({ where: { applicationId: id.data, senderId: { not: user.id }, id: { in: input.data.ids }, readAt: null }, data: { readAt: new Date() } });
  return NextResponse.json({ ok: true });
});
