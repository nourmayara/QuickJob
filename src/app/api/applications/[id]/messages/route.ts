import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { protectedRoute, idSchema, fail } from "@/lib/api";
import { messageInput } from "@/lib/communication-validation";
import { participantApplication, threadMessages, sendMessage } from "@/lib/communication-service";
import { removeStored, shareSchema, storeUpload, type StoredUpload } from "@/lib/message-attachments";
export const GET = protectedRoute(["TRAVAILLEUR", "RECRUTEUR"], async (request, context, user) => {
  const id = idSchema.safeParse((await context.params).id);
  const raw = new URL(request.url).searchParams.get("before");
  const before = raw === null ? undefined : idSchema.safeParse(raw);
  if (!id.success || (before && !before.success)) return fail(400, "Identifiant invalide");
  return NextResponse.json(await threadMessages(user, id.data, before?.data), { headers: { "Cache-Control": "no-store" } });
});
export const POST = protectedRoute(["TRAVAILLEUR", "RECRUTEUR"], async (request, context, user) => {
  const id = idSchema.safeParse((await context.params).id);
  if (!id.success) return fail(400, "Identifiant invalide");
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    const input = messageInput.safeParse(await request.json().catch(() => null));
    if (!input.success) return fail(400, input.error.issues[0].message);
    return NextResponse.json(await sendMessage(user, id.data, input.data.body), { status: 201 });
  }
  if (Number(request.headers.get("content-length") || 0) > 55_000_000) return fail(413, "Le téléversement dépasse la taille autorisée");
  await participantApplication(prisma, user, id.data);
  const form = await request.formData().catch(() => null);
  if (!form) return fail(400, "Téléversement invalide");
  const body = String(form.get("body") || "").trim();
  if (body.length > 4000) return fail(400, "Le message est limité à 4 000 caractères");
  const files = form.getAll("files").filter((value): value is File => value instanceof File && value.size > 0);
  if (files.length > 5) return fail(400, "Vous pouvez joindre au maximum 5 fichiers");
  const metadataRaw = String(form.get("share") || "");
  let metadata: ReturnType<typeof shareSchema.safeParse> | null = null;
  try { metadata = metadataRaw ? shareSchema.safeParse(JSON.parse(metadataRaw)) : null; } catch { return fail(400, "Partage invalide"); }
  if (metadataRaw && (!metadata || !metadata.success)) return fail(400, "Partage invalide");
  if (!body && !files.length && !metadata?.success) return fail(400, "Écrivez un message ou ajoutez un partage");
  const stored: StoredUpload[] = [];
  try {
    const duration = Number(form.get("duration") || 0);
    for (const file of files) stored.push(await storeUpload(file, files.length === 1 ? duration : undefined));
    const attachments = [...stored, ...(metadata?.success ? [metadata.data] : [])];
    return NextResponse.json(await sendMessage(user, id.data, body, attachments), { status: 201 });
  } catch (error) {
    await Promise.all(stored.map(item => removeStored(item.storageKey)));
    if (error instanceof Error && error.message === "TYPE") return fail(415, "Type de fichier non autorisé");
    if (error instanceof Error && error.message === "SIZE") return fail(413, "Fichier vide ou trop volumineux");
    throw error;
  }
});
export const PATCH = protectedRoute(["TRAVAILLEUR", "RECRUTEUR"], async (request, context, user) => {
  const id = idSchema.safeParse((await context.params).id);
  const input = z.object({ ids: z.array(z.number().int().positive()).min(1).max(50) }).strict().safeParse(await request.json().catch(() => null));
  if (!id.success || !input.success) return fail(400, "Données invalides");
  await participantApplication(prisma, user, id.data);
  await prisma.message.updateMany({ where: { applicationId: id.data, senderId: { not: user.id }, id: { in: input.data.ids }, readAt: null }, data: { readAt: new Date() } });
  return NextResponse.json({ ok: true });
});
