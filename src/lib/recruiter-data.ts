import "server-only";
import { notFound } from "next/navigation";
import prisma from "./prisma";
import { requirePageRole } from "./authorization";

export const missionInclude = { _count: { select: { applications: true } }, applications: { where: { status: "ACCEPTED" }, select: { id: true } } } as const;
export const workerSelect = { id: true, firstName: true, name: true, city: true, avatarUrl: true, skills: true, bio: true, experience: true, languages: true } as const;
export async function ownedMission(value: string) {
  const user = await requirePageRole(["RECRUTEUR"]);
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();
  const mission = await prisma.mission.findFirst({ where: { id, recruiterId: user.id }, include: missionInclude });
  if (!mission) notFound();
  return mission;
}
export function pageNumber(value?: string) { return Math.min(100000, Math.max(1, Number.parseInt(value ?? "1", 10) || 1)); }
