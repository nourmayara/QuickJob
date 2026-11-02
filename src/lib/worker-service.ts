import "server-only";
import prisma from "./prisma";
import { publishedMissionWhere } from "./worker-data";

export class WorkerError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function withdrawApplication(workerId: number, id: number) {
  return prisma.$transaction(async tx => {
    const application = await tx.application.findFirst({ where: { id, workerId }, select: { missionId: true, status: true } });
    if (!application) throw new WorkerError(404, "Candidature introuvable");
    // Same mission write lock as acceptance and capacity changes.
    const locked = await tx.mission.updateMany({ where: { id: application.missionId, status: { in: ["PUBLISHED", "FULL", "CLOSED"] } }, data: { id: application.missionId } });
    if (!locked.count) throw new WorkerError(409, "Cette mission ne permet plus de retirer une candidature");
    const changed = await tx.application.updateMany({ where: { id, workerId, status: { in: ["PENDING", "ACCEPTED"] } }, data: { status: "CANCELLED", cancelledBy: "WORKER", cancelledAt: new Date(), cancelledFromStatus: application.status } });
    if (!changed.count) throw new WorkerError(409, "Cette candidature ne peut plus être retirée");
    const mission = await tx.mission.findUniqueOrThrow({ where: { id: application.missionId } });
    const occupied = await tx.application.count({ where: { missionId: mission.id, status: "ACCEPTED" } });
    if (mission.status === "FULL" && occupied < mission.capacity) await tx.mission.update({ where: { id: mission.id }, data: { status: "PUBLISHED" } });
    await tx.notification.create({ data: { userId: mission.recruiterId, kind: "APPLICATION", applicationId: id, missionId: mission.id, message: `Une candidature pour « ${mission.title} » a été retirée par le travailleur.` } });
    await tx.notification.create({ data: { userId: workerId, kind: "APPLICATION", applicationId: id, missionId: mission.id, message: `Votre candidature pour « ${mission.title} » a été retirée.` } });
    return { ok: true, status: "CANCELLED" };
  });
}
export async function applyToMission(workerId: number, missionId: number, message?: string) {
  return prisma.$transaction(async tx => {
    // Lock the same mission row used by recruiter decisions BEFORE reading places.
    const locked = await tx.mission.updateMany({ where: { id: missionId, ...publishedMissionWhere }, data: { status: "PUBLISHED" } });
    if (!locked.count) throw new WorkerError(404, "Cette mission n’est plus ouverte aux candidatures");
    const mission = await tx.mission.findUniqueOrThrow({ where: { id: missionId }, select: { capacity: true } });
    const occupied = await tx.application.count({ where: { missionId, status: "ACCEPTED" } });
    if (occupied >= mission.capacity) throw new WorkerError(409, "Toutes les places de cette mission sont occupées");
    if (await tx.application.findUnique({ where: { missionId_workerId: { missionId, workerId } }, select: { id: true } })) throw new WorkerError(409, "Vous avez déjà postulé à cette mission");
    const application = await tx.application.create({ data: { missionId, workerId, message: message || null, status: "PENDING" } });
    const target = await tx.mission.findUniqueOrThrow({ where: { id: missionId }, select: { recruiterId: true, title: true } });
    await tx.notification.create({ data: { userId: target.recruiterId, kind: "APPLICATION", applicationId: application.id, missionId, message: `Nouvelle candidature pour « ${target.title} ».` } });
    return application;
  });
}
