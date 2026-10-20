import "server-only";
import prisma from "./prisma";
import { missionCreateSchema, missionPatchSchema } from "./recruiter-validation";
import type { z } from "zod";

export class RecruiterError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
const transitions: Record<string, string[]> = {
  DRAFT: ["PUBLISHED", "CANCELLED"], PUBLISHED: ["CLOSED", "CANCELLED", "IN_PROGRESS"],
  FULL: ["CLOSED", "CANCELLED", "IN_PROGRESS"], CLOSED: ["IN_PROGRESS", "CANCELLED", "COMPLETED"], IN_PROGRESS: ["COMPLETED", "CANCELLED"],
};
function validateTimes(start?: string | null, end?: string | null) {
  if (start && end && end <= start) throw new RecruiterError(400, "L’heure de fin doit suivre l’heure de début");
}
export async function createMission(recruiterId: number, input: z.infer<typeof missionCreateSchema>) {
  validateTimes(input.startTime, input.endTime);
  return prisma.mission.create({ data: { ...input, date: input.date ? new Date(`${input.date}T00:00:00Z`) : undefined, recruiterId } });
}
export async function updateMission(recruiterId: number, id: number, input: z.infer<typeof missionPatchSchema>) {
  return prisma.$transaction(async tx => {
    // Acquire SQLite's write lock before reading capacity or changing decisions.
    const locked = await tx.mission.updateMany({ where: { id, recruiterId, status: { notIn: ["MODERATED", "COMPLETED", "CANCELLED"] } }, data: { recruiterId } });
    if (!locked.count) throw new RecruiterError(404, "Mission introuvable ou non modifiable");
    const mission = await tx.mission.findUniqueOrThrow({ where: { id } });
    const { status, ...details } = input;
    if (Object.keys(details).length && !["DRAFT", "PUBLISHED", "FULL"].includes(mission.status)) throw new RecruiterError(409, "Cette mission ne peut plus être modifiée");
    if (status && status !== mission.status && !transitions[mission.status]?.includes(status)) throw new RecruiterError(409, "Changement de statut impossible");
    validateTimes(input.startTime ?? mission.startTime, input.endTime ?? mission.endTime);
    const count = await tx.application.count({ where: { missionId: id, status: "ACCEPTED" } });
    const capacity = input.capacity ?? mission.capacity;
    if (capacity < count) throw new RecruiterError(409, "La capacité ne peut pas être inférieure au nombre de travailleurs sélectionnés");
    let nextStatus = status ?? mission.status;
    if (["PUBLISHED", "FULL"].includes(nextStatus)) nextStatus = count >= capacity ? "FULL" : "PUBLISHED";
    return tx.mission.update({ where: { id }, data: { ...details, date: input.date ? new Date(`${input.date}T00:00:00Z`) : undefined, status: nextStatus } });
  });
}
export async function decideApplication(recruiterId: number, id: number, status: "ACCEPTED" | "REJECTED") {
  return prisma.$transaction(async tx => {
    // Ownership is checked before returning any worker data.
    const application = await tx.application.findFirst({ where: { id, mission: { recruiterId } }, select: { missionId: true } });
    if (!application) throw new RecruiterError(404, "Candidature introuvable");
    const locked = await tx.mission.updateMany({ where: { id: application.missionId, recruiterId, status: { in: ["PUBLISHED", "FULL", "CLOSED"] } }, data: { recruiterId } });
    if (!locked.count) throw new RecruiterError(409, "Cette mission ne permet plus de traiter les candidatures");
    const mission = await tx.mission.findUniqueOrThrow({ where: { id: application.missionId } });
    if (status === "ACCEPTED") {
      const count = await tx.application.count({ where: { missionId: mission.id, status: "ACCEPTED" } });
      if (mission.status !== "PUBLISHED" || count >= mission.capacity) throw new RecruiterError(409, "Aucune place disponible ou candidatures clôturées");
    }
    const changed = await tx.application.updateMany({ where: { id, status: "PENDING", mission: { recruiterId } }, data: { status } });
    if (!changed.count) throw new RecruiterError(409, "Cette candidature a déjà été traitée");
    if (status === "ACCEPTED") {
      const count = await tx.application.count({ where: { missionId: mission.id, status: "ACCEPTED" } });
      if (count >= mission.capacity) await tx.mission.update({ where: { id: mission.id }, data: { status: "FULL" } });
    }
    return { ok: true };
  });
}
