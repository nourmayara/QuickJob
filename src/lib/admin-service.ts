import "server-only";
import type { Prisma } from "@prisma/client";
import type { z } from "zod";
import prisma from "./prisma";
import { publicUserSelect } from "./authorization";
import { usersFilter, missionsFilter, reportsFilter, reportDecisionInput, reportInput } from "./admin-validation";
import { lockAdmin } from "./admin-lock";
import { WorkerError } from "./worker-service";
import { publishedMissionWhere } from "./worker-data";
export const adminUserSelect = { ...publicUserSelect, phone: true, companyName: true, city: true, sector: true, bio: true, address: true } as const;
export async function listAdminUsers(input: z.infer<typeof usersFilter>) {
  const where: Prisma.UserWhereInput = { ...(input.role ? { role: input.role } : {}), ...(input.status ? { suspended: input.status === "SUSPENDU" } : {}), ...(input.q ? { OR: ["name", "firstName", "email", "companyName"].map(key => ({ [key]: { contains: input.q } })) } : {}) };
  const [items, total] = await Promise.all([prisma.user.findMany({ where, select: adminUserSelect, orderBy: { id: "desc" }, take: 25, skip: (input.page - 1) * 25 }), prisma.user.count({ where })]);
  return { items, total, page: input.page };
}
export async function setSuspension(adminId: number, id: number, suspended: boolean) {
  if (id === adminId) throw new WorkerError(403, "Auto-suspension interdite");
  return prisma.$transaction(async tx => {
    await lockAdmin(tx, adminId);
    const target = await tx.user.findUnique({ where: { id }, select: { suspended: true } });
    if (!target) throw new WorkerError(404, "Utilisateur introuvable");
    await tx.user.update({ where: { id }, data: { suspended }, select: { id: true } });
    if (suspended) await tx.session.updateMany({ where: { userId: id }, data: { expiresAt: new Date(0) } });
    if (target.suspended !== suspended) await tx.adminAction.create({ data: { adminId, targetType: "USER", targetId: id, action: suspended ? "USER_SUSPEND" : "USER_REACTIVATE", reason: suspended ? "Suspension du compte" : "Réactivation du compte" } });
    return { ok: true };
  });
}
export async function listAdminMissions(input: z.infer<typeof missionsFilter>) {
  const where: Prisma.MissionWhereInput = { ...(input.status ? { status: input.status } : {}), ...(input.q ? { OR: [{ title: { contains: input.q } }, { city: { contains: input.q } }, { recruiter: { companyName: { contains: input.q } } }] } : {}) };
  const [items, total] = await Promise.all([prisma.mission.findMany({ where, include: { recruiter: { select: { id: true, name: true, firstName: true, companyName: true } }, _count: { select: { applications: true } } }, orderBy: { id: "desc" }, take: 25, skip: (input.page - 1) * 25 }), prisma.mission.count({ where })]);
  return { items, total, page: input.page };
}
export async function moderateMission(adminId: number, id: number, reason: string) {
  return prisma.$transaction(async tx => {
    await lockAdmin(tx, adminId);
    const mission = await tx.mission.findUnique({ where: { id }, select: { status: true, title: true, recruiterId: true } });
    if (!mission) throw new WorkerError(404, "Mission introuvable");
    if (mission.status === "MODERATED") throw new WorkerError(409, "Cette mission est déjà masquée");
    await tx.mission.update({ where: { id }, data: { status: "MODERATED" }, select: { id: true } });
    await tx.adminAction.create({ data: { adminId, targetType: "MISSION", targetId: id, action: "MISSION_MODERATE", reason } });
    const recipients = await tx.application.findMany({ where: { missionId: id, status: { in: ["PENDING", "ACCEPTED"] } }, select: { workerId: true } });
    await tx.notification.createMany({ data: [...new Set([mission.recruiterId, ...recipients.map(a => a.workerId)])].map(userId => ({ userId, kind: "MISSION", missionId: id, message: `La mission « ${mission.title} » a été masquée par la modération. Elle n’est plus disponible au recrutement.` })) });
    return { ok: true };
  });
}
export const reportInclude = { author: { select: { id: true, name: true, firstName: true, email: true } }, targetUser: { select: { id: true, name: true, firstName: true } }, mission: { select: { id: true, title: true } }, moderator: { select: { name: true, firstName: true } } } as const;
export async function createReport(user: { id: number; role: string }, input: z.infer<typeof reportInput>) {
  if (input.targetUserId === user.id) throw new WorkerError(400, "Vous ne pouvez pas signaler votre propre profil");
  if (input.missionId && !await prisma.mission.findFirst({ where: { id: input.missionId, OR: [publishedMissionWhere, { recruiterId: user.id }, { applications: { some: { workerId: user.id } } }] }, select: { id: true } })) throw new WorkerError(404, "Mission introuvable");
  if (input.targetUserId) {
    const related: Prisma.UserWhereInput = user.role === "TRAVAILLEUR" ? { role: "RECRUTEUR", missions: { some: { ...(input.missionId ? { id: input.missionId } : {}), OR: [publishedMissionWhere, { applications: { some: { workerId: user.id } } }] } } } : { role: "TRAVAILLEUR", applications: { some: { mission: { recruiterId: user.id, ...(input.missionId ? { id: input.missionId } : {}) } } } };
    if (!await prisma.user.findFirst({ where: { id: input.targetUserId, ...related }, select: { id: true } })) throw new WorkerError(404, "Profil non accessible dans ce contexte");
  }
  return prisma.$transaction(async tx => {
    const report = await tx.report.create({ data: { ...input, authorId: user.id }, select: { id: true, kind: true, status: true, createdAt: true } });
    const admins = await tx.user.findMany({ where: { role: "ADMIN", suspended: false }, select: { id: true } });
    if (admins.length) await tx.notification.createMany({ data: admins.map(admin => ({ userId: admin.id, kind: "REPORT", message: `Nouveau signalement #${report.id} à examiner.` })) });
    return report;
  });
}
export async function listReports(input: z.infer<typeof reportsFilter>) {
  const where: Prisma.ReportWhereInput = { ...(input.status ? { status: input.status } : {}), ...(input.q ? { OR: [{ reason: { contains: input.q } }, { mission: { title: { contains: input.q } } }] } : {}) };
  const [items, total] = await Promise.all([prisma.report.findMany({ where, include: reportInclude, orderBy: { id: "desc" }, take: 25, skip: (input.page - 1) * 25 }), prisma.report.count({ where })]);
  return { items, total, page: input.page };
}
export async function decideReport(adminId: number, id: number, input: z.infer<typeof reportDecisionInput>) {
  return prisma.$transaction(async tx => {
    await lockAdmin(tx, adminId);
    const report = await tx.report.findUnique({ where: { id } });
    if (!report) throw new WorkerError(404, "Signalement introuvable");
    if (report.status !== input.expectedStatus || !["NOUVEAU", "EN_COURS"].includes(report.status) || report.status === input.status) throw new WorkerError(409, "Ce signalement a déjà été traité ou modifié. Actualisez la page.");
    const updated = await tx.report.updateMany({ where: { id, status: input.expectedStatus }, data: { status: input.status, resolution: input.resolution || "Prise en charge", moderatorId: adminId, decidedAt: new Date() } });
    if (!updated.count) throw new WorkerError(409, "Une autre décision a été enregistrée");
    await tx.adminAction.create({ data: { adminId, targetType: "REPORT", targetId: id, action: `REPORT_${input.status}`, reason: input.resolution || "Prise en charge" } });
    if (report.authorId && ["RESOLU", "REJETE"].includes(input.status)) await tx.notification.create({ data: { userId: report.authorId, message: `Votre signalement #${id} a été ${input.status === "RESOLU" ? "résolu" : "rejeté"}. ${input.resolution}` } });
    return { ok: true };
  });
}
