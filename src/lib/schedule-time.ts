import { z } from "zod";

export const scheduleTimeZone = "Africa/Tunis";
const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: scheduleTimeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
export function localParts(value: Date | string) {
  const parts = Object.fromEntries(formatter.formatToParts(new Date(value)).map(p => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}
// Resolve the IANA zone offset, independently of the browser/server timezone.
export function scheduleInstant(date: string, time: string) {
  const wall = Date.parse(`${date}T${time}:00Z`);
  const rendered = localParts(new Date(wall));
  const offset = Date.parse(`${rendered.date}T${rendered.time}:00Z`) - wall;
  return new Date(wall - offset);
}
export function missionInterval(mission: { date: Date | null; startTime: string | null; endTime: string | null }) {
  if (!mission.date || !mission.startTime || !mission.endTime || !/^([01]\d|2[0-3]):[0-5]\d$/.test(mission.startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(mission.endTime) || mission.endTime <= mission.startTime) return null;
  const date = mission.date.toISOString().slice(0, 10); // Existing mission dates are civil dates stored at UTC midnight.
  return { startAt: scheduleInstant(date, mission.startTime), endAt: scheduleInstant(date, mission.endTime) };
}
export function overlaps(a: { startAt: Date; endAt: Date }, b: { startAt: Date; endAt: Date }) {
  return a.startAt < b.endAt && b.startAt < a.endAt;
}
const date = z.string().regex(/^20\d{2}-\d{2}-\d{2}$/).refine(value => !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value, "Date invalide");
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horaire invalide");
export const availabilityInput = z.object({ date, startTime: time, endTime: time, kind: z.enum(["AVAILABLE", "UNAVAILABLE"]), note: z.string().trim().max(500).default("") }).strict().refine(v => v.endTime > v.startTime, { path: ["endTime"], message: "La fin doit suivre le début, le même jour" });
export const calendarMonthInput = z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])$/, "Mois invalide");
export function monthBounds(month: string) {
  const [year, number] = month.split("-").map(Number);
  const next = new Date(Date.UTC(year, number, 1)).toISOString().slice(0, 10);
  return { startAt: scheduleInstant(`${month}-01`, "00:00"), endAt: scheduleInstant(next, "00:00") };
}
