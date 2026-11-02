import { notificationPresentation } from "@/lib/notification-presentation";
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authorization";
import prisma from "@/lib/prisma";
import { notificationReadInput } from "@/lib/communication-validation";
import { idSchema, fail } from "@/lib/api";
export async function GET(request: Request) {
  const auth = await requireRole();
  if (auth.response) return auth.response;
  const page = idSchema.safeParse(new URL(request.url).searchParams.get("page") ?? "1");
  if (!page.success || page.data > 100000) return fail(400, "Page invalide");
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({ where: { userId: auth.user.id }, select: { id: true, message: true, createdAt: true, readAt: true, kind: true, missionId: true, applicationId: true, verificationId: true }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 20, skip: (page.data - 1) * 20 }),
    prisma.notification.count({ where: { userId: auth.user.id, readAt: null } }),
  ]);
  return NextResponse.json(items.map(item => ({ ...item, ...notificationPresentation(item, auth.user.role, auth.user.recruiterVerification?.status) })), { headers: { "Cache-Control": "no-store", "X-Unread-Count": String(unread) } });
}
export async function PATCH(request: Request) {
  const auth = await requireRole();
  if (auth.response) return auth.response;
  const input = notificationReadInput.safeParse(await request.json().catch(() => null));
  if (!input.success) return fail(400, "Données invalides");
  if (input.data.id && !await prisma.notification.findFirst({ where: { id: input.data.id, userId: auth.user.id }, select: { id: true } })) return fail(404, "Notification introuvable");
  await prisma.notification.updateMany({ where: { userId: auth.user.id, readAt: null, ...(input.data.id ? { id: input.data.id } : {}) }, data: { readAt: new Date() } });
  return NextResponse.json({ ok: true });
}
