import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { protectedRoute, idSchema, fail } from "@/lib/api";
import { participantApplication } from "@/lib/communication-service";
import { storedFile } from "@/lib/message-attachments";

export const GET = protectedRoute<{ messageId: string; attachmentId: string }>(["TRAVAILLEUR", "RECRUTEUR"], async (_request, context, user) => {
  const params = await context.params;
  const messageId = idSchema.safeParse(params.messageId), attachmentId = idSchema.safeParse(params.attachmentId);
  if (!messageId.success || !attachmentId.success) return fail(400, "Identifiant invalide");
  const attachment = await prisma.messageAttachment.findFirst({ where: { id: attachmentId.data, messageId: messageId.data }, select: { storageKey: true, mimeType: true, name: true, message: { select: { applicationId: true } } } });
  if (!attachment?.storageKey || !attachment.mimeType) return fail(404, "Fichier introuvable");
  await participantApplication(prisma, user, attachment.message.applicationId);
  const data = await storedFile(attachment.storageKey).catch(() => null);
  if (!data) return fail(404, "Fichier introuvable");
  const inline = attachment.mimeType.startsWith("image/") || attachment.mimeType.startsWith("video/") || attachment.mimeType.startsWith("audio/") || attachment.mimeType === "application/pdf";
  const originalName = (attachment.name || "fichier").replace(/[\r\n"]/g, "_");
  const safeName = originalName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7e]/g, "_");
  return new NextResponse(data, { headers: { "Content-Type": attachment.mimeType, "Content-Length": String(data.byteLength), "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(originalName)}`, "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff" } });
});
