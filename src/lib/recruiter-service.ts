import { requireActiveCategory } from "./category-service";
import "server-only";
import prisma from "./prisma";
import { missionCreateSchema, missionPatchSchema, missionFormSchema } from "./recruiter-validation";
import type { z } from "zod";
import { missionInterval } from "./schedule-time";
import { scheduleConflict } from "./schedule-service";

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
  return prisma.$transaction(async tx => {
    const category = input.category ? await requireActiveCategory(tx, input.category) : undefined;
    return tx.mission.create({ data: { ...input, category, date: input.date ? new Date(`${input.date}T00:00:00Z`) : undefined, recruiterId } });
  });
}
export async function updateMission(recruiterId: number, id: number, input: z.infer<typeof missionPatchSchema>) {
  return prisma.$transaction(async tx => {
    // Acquire SQLite's write lock before reading capacity or changing decisions.
    const locked = await tx.mission.updateMany({ where: { id, recruiterId, status: { notIn: ["MODERATED", "COMPLETED", "CANCELLED"] } }, data: { recruiterId } });
    if (!locked.count) throw new RecruiterError(404, "Mission introuvable ou non modifiable");
    const mission = await tx.mission.findUniqueOrThrow({ where: { id } });
    const { status, ...details } = input;
    if (input.category && (input.category !== mission.category || (mission.status === "DRAFT" && status === "PUBLISHED"))) details.category = await requireActiveCategory(tx, input.category);
    if (mission.status === "DRAFT" && status === "PUBLISHED" && !input.category && mission.category) await requireActiveCategory(tx, mission.category);
    if (Object.keys(details).length && !["DRAFT", "PUBLISHED", "FULL"].includes(mission.status)) throw new RecruiterError(409, "Cette mission ne peut plus être modifiée");
    if (status && status !== mission.status && !transitions[mission.status]?.includes(status)) throw new RecruiterError(409, "Changement de statut impossible");
    validateTimes(input.startTime ?? mission.startTime, input.endTime ?? mission.endTime);
    const count = await tx.application.count({ where: { missionId: id, status: "ACCEPTED" } });
    const capacity = input.capacity ?? mission.capacity;
    if (capacity < count) throw new RecruiterError(409, "La capacité ne peut pas être inférieure au nombre de travailleurs sélectionnés");
    let nextStatus = status ?? mission.status;
    if (["PUBLISHED", "FULL"].includes(nextStatus)) nextStatus = count >= capacity ? "FULL" : "PUBLISHED";
    // Validate the resulting record, including legacy drafts and partial PATCHes.
    // Status-only closure/cancellation must remain possible for old missions.
    if (["PUBLISHED", "FULL"].includes(nextStatus) && (mission.status === "DRAFT" || Object.keys(details).length > 0)) {
      const parsed = missionFormSchema.safeParse({
        title: input.title ?? mission.title, description: input.description ?? mission.description,
        category: input.category ?? mission.category, city: input.city ?? mission.city,
        address: input.address ?? mission.address,
        date: input.date ?? mission.date?.toISOString().slice(0, 10),
        startTime: input.startTime ?? mission.startTime, endTime: input.endTime ?? mission.endTime,
        pay: input.pay ?? mission.pay, capacity, skills: input.skills ?? mission.skills,
        experience: input.experience ?? mission.experience ?? undefined, status: "PUBLISHED",
      });
      if (!parsed.success) throw new RecruiterError(400, parsed.error.issues[0].message);
    }
    if (input.date !== undefined || input.startTime !== undefined || input.endTime !== undefined) {
      const range = missionInterval({ date: input.date ? new Date(`${input.date}T00:00:00Z`) : mission.date, startTime: input.startTime ?? mission.startTime, endTime: input.endTime ?? mission.endTime });
      const accepted = await tx.application.findMany({ where: { missionId: id, status: "ACCEPTED" }, select: { workerId: true } });
      if (accepted.length && !range) throw new RecruiterError(409, "Les horaires des missions confirmées doivent être complets");
      if (range) for (const application of accepted) {
        const conflict = await scheduleConflict(tx, application.workerId, range, id);
        if (conflict) throw new RecruiterError(409, conflict);
      }
    }
    const updated = await tx.mission.update({ where: { id }, data: { ...details, date: input.date ? new Date(`${input.date}T00:00:00Z`) : undefined, status: nextStatus } });
    const changed = nextStatus !== mission.status || Object.entries(details).some(([key, value]) => key === "date" ? value !== mission.date?.toISOString().slice(0, 10) : value !== mission[key as keyof typeof mission]);
    if (changed) {
      const recipients = await tx.application.findMany({ where: { missionId: id, status: { in: ["PENDING", "ACCEPTED"] } }, select: { workerId: true } });
      const message = nextStatus === "CANCELLED" ? `La mission « ${updated.title} » a été annulée.` : nextStatus === "COMPLETED" ? `La mission « ${updated.title} » est terminée. Vous pouvez consulter votre suivi et laisser une évaluation si vous avez participé.` : `La mission « ${updated.title} » a été modifiée. Consultez ses informations et son statut actualisés.`;
      if (recipients.length) await tx.notification.createMany({ data: recipients.map(a => ({ userId: a.workerId, kind: "MISSION", missionId: id, message })) });
    }
    return updated;
  });
}
export async function decideApplication(recruiterId: number, id: number, status: "ACCEPTED" | "REJECTED") {
  return prisma.$transaction(async tx => {
    // Ownership is checked before returning any worker data.
    const application = await tx.application.findFirst({ where: { id, mission: { recruiterId } }, select: { missionId: true, workerId: true } });
    if (!application) throw new RecruiterError(404, "Candidature introuvable");
    const locked = await tx.mission.updateMany({ where: { id: application.missionId, recruiterId, status: { in: ["PUBLISHED", "FULL", "CLOSED"] } }, data: { recruiterId } });
    if (!locked.count) throw new RecruiterError(409, "Cette mission ne permet plus de traiter les candidatures");
    const mission = await tx.mission.findUniqueOrThrow({ where: { id: application.missionId } });
    if (status === "ACCEPTED") {
      const range = missionInterval(mission);
      if (!range) throw new RecruiterError(409, "Renseignez la date et les horaires de la mission avant de confirmer une candidature");
      const conflict = await scheduleConflict(tx, application.workerId, range, mission.id);
      if (conflict) throw new RecruiterError(409, conflict);
      const count = await tx.application.count({ where: { missionId: mission.id, status: "ACCEPTED" } });
      if (mission.status !== "PUBLISHED" || count >= mission.capacity) throw new RecruiterError(409, "Aucune place disponible ou candidatures clôturées");
    }
    const changed = await tx.application.updateMany({ where: { id, status: "PENDING", mission: { recruiterId } }, data: { status } });
    if (!changed.count) throw new RecruiterError(409, "Cette candidature a déjà été traitée");
    if (status === "ACCEPTED") {
      const count = await tx.application.count({ where: { missionId: mission.id, status: "ACCEPTED" } });
      if (count >= mission.capacity) await tx.mission.update({ where: { id: mission.id }, data: { status: "FULL" } });
    }
    await tx.notification.create({ data: { userId: application.workerId, kind: "APPLICATION", applicationId: id, missionId: mission.id, message: `Votre candidature pour « ${mission.title} » a été ${status === "ACCEPTED" ? "acceptée" : "refusée"}.` } });
    return { ok: true, status };
  });
}
