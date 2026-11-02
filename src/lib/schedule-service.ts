import "server-only";
import type { Prisma } from "@prisma/client";
import prisma from "./prisma";
import { WorkerError } from "./worker-service";
import { localParts, missionInterval, monthBounds, overlaps, scheduleInstant, scheduleTimeZone, type availabilityInput } from "./schedule-time";
import type { z } from "zod";

export const activeScheduleStatuses = ["PUBLISHED", "FULL", "CLOSED", "IN_PROGRESS"];
export async function scheduleConflict(tx: Prisma.TransactionClient, workerId: number, range: { startAt: Date; endAt: Date }, excludeMissionId?: number, checkUnavailability = true) {
  if (checkUnavailability && await tx.availability.findFirst({ where: { workerId, kind: "UNAVAILABLE", startAt: { lt: range.endAt }, endAt: { gt: range.startAt } }, select: { id: true } })) return "Ce créneau chevauche une indisponibilité déclarée";
  const applications = await tx.application.findMany({ where: { workerId, status: "ACCEPTED", mission: { status: { in: activeScheduleStatuses }, ...(excludeMissionId ? { id: { not: excludeMissionId } } : {}) } }, select: { mission: { select: { date: true, startTime: true, endTime: true } } } });
  if (applications.some(a => { const interval = missionInterval(a.mission); return interval && overlaps(range, interval); })) return "Ce créneau chevauche une mission déjà confirmée. Retirez d’abord la candidature concernée si vous souhaitez vous désengager.";
  return null;
}
export async function saveAvailability(workerId: number, input: z.infer<typeof availabilityInput>, id?: number) {
  const range = { startAt: scheduleInstant(input.date, input.startTime), endAt: scheduleInstant(input.date, input.endTime) };
  if (localParts(range.startAt).date !== input.date || localParts(range.startAt).time !== input.startTime || localParts(range.endAt).date !== input.date || localParts(range.endAt).time !== input.endTime) throw new WorkerError(400, "Cet horaire n’existe pas dans le fuseau de Tunisie");
  return prisma.$transaction(async tx => {
    // SQLite's write lock serializes slot edits, acceptances and mission rescheduling.
    await tx.user.update({ where: { id: workerId }, data: { id: workerId }, select: { id: true } });
    if (id && !await tx.availability.findFirst({ where: { id, workerId }, select: { id: true } })) throw new WorkerError(404, "Créneau introuvable");
    if (await tx.availability.findFirst({ where: { workerId, ...(id ? { id: { not: id } } : {}), startAt: { lt: range.endAt }, endAt: { gt: range.startAt } }, select: { id: true } })) throw new WorkerError(409, "Ce créneau chevauche un créneau existant. Modifiez ou supprimez ce dernier.");
    if (input.kind === "UNAVAILABLE") {
      const conflict = await scheduleConflict(tx, workerId, range, undefined, false);
      if (conflict) throw new WorkerError(409, conflict);
    }
    const data = { ...range, kind: input.kind, note: input.note };
    return id ? tx.availability.update({ where: { id }, data }) : tx.availability.create({ data: { ...data, workerId } });
  });
}
export async function calendarData(workerId: number, month: string) {
  const bounds = monthBounds(month);
  const [slots, applications] = await Promise.all([
    prisma.availability.findMany({ where: { workerId, startAt: { lt: bounds.endAt }, endAt: { gt: bounds.startAt } }, orderBy: { startAt: "asc" } }),
    prisma.application.findMany({ where: { workerId, status: { in: ["PENDING", "ACCEPTED"] }, mission: { status: { in: [...activeScheduleStatuses, "COMPLETED"] }, date: { gte: new Date(`${month}-01T00:00:00Z`), lt: new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 1)) } } }, select: { id: true, status: true, mission: { select: { id: true, title: true, date: true, startTime: true, endTime: true, city: true, status: true } } } }),
  ]);
  const events = [
    ...slots.map(s => ({ id: `slot-${s.id}`, slotId: s.id, type: s.kind, title: s.kind === "AVAILABLE" ? "Disponible" : "Indisponible", date: localParts(s.startAt).date, startTime: localParts(s.startAt).time, endTime: localParts(s.endAt).time, note: s.note, href: "", startAt: s.startAt.toISOString(), endAt: s.endAt.toISOString() })),
    ...applications.flatMap(a => { const range = missionInterval(a.mission); return range ? [{ id: `application-${a.id}`, slotId: null, type: a.status, title: a.mission.title, date: localParts(range.startAt).date, startTime: localParts(range.startAt).time, endTime: localParts(range.endAt).time, note: [a.mission.city, a.status === "ACCEPTED" ? "Mission acceptée et confirmée" : "Candidature en attente"].filter(Boolean).join(" · "), href: `/dashboard/travailleur/candidatures/${a.id}`, startAt: range.startAt.toISOString(), endAt: range.endAt.toISOString() }] : []; }),
  ].sort((a, b) => a.startAt.localeCompare(b.startAt));
  const unscheduled = applications.filter(a => !missionInterval(a.mission)).length;
  return { month, timeZone: scheduleTimeZone, events, unscheduled };
}
export type CalendarData = Awaited<ReturnType<typeof calendarData>>;
