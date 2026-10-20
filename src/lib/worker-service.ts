import "server-only";
import prisma from "./prisma";
import { publishedMissionWhere } from "./worker-data";

export class WorkerError extends Error {
  constructor(public status: number, message: string) { super(message); }
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
    return tx.application.create({ data: { missionId, workerId, message: message || null, status: "PENDING" } });
  });
}
