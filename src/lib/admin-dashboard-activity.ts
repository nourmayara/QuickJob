import "server-only";
import prisma from "./prisma";

// Creation timestamps are persisted; status changes have no reliable event date.
export async function adminDashboardActivity() {
  const [missions, applications, verifications] = await Promise.all([
    prisma.mission.findMany({ select: { id: true, title: true, createdAt: true }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 4 }),
    prisma.application.findMany({ select: { id: true, createdAt: true, mission: { select: { title: true } } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 4 }),
    prisma.recruiterVerification.findMany({ where: { requestedAt: { not: null } }, select: { userId: true, requestedAt: true, user: { select: { name: true } } }, orderBy: [{ requestedAt: "desc" }, { userId: "desc" }], take: 4 }),
  ]);
  return [
    ...missions.map(m => ({ id: `mission-${m.id}`, title: "Nouvelle mission créée", detail: m.title, date: m.createdAt, icon: "briefcase" as const, href: `/admin/missions/${m.id}` })),
    ...applications.map(a => ({ id: `application-${a.id}`, title: "Candidature reçue", detail: a.mission.title, date: a.createdAt, icon: "mail" as const, href: `/admin/missions` })),
    ...verifications.flatMap(v => v.requestedAt ? [{ id: `verification-${v.userId}`, title: "Vérification demandée", detail: v.user.name, date: v.requestedAt, icon: "shield" as const, href: `/admin/recruteurs/${v.userId}` }] : []),
  ].sort((a, b) => b.date.getTime() - a.date.getTime() || a.id.localeCompare(b.id)).slice(0, 4);
}
