import "server-only";
import type { Prisma } from "@prisma/client";
import type { WorkerSearch } from "./worker-validation";

export const publishedMissionWhere = { status: "PUBLISHED", recruiter: { role: "RECRUTEUR", suspended: false, recruiterVerification: { is: { status: "APPROUVE" } } } } satisfies Prisma.MissionWhereInput;
export function visibleWorkerMission(workerId: number): Prisma.MissionWhereInput {
  return { OR: [publishedMissionWhere, { status: { not: "MODERATED" }, applications: { some: { workerId } } }] };
}
export function workerMissionInclude(workerId: number) {
  return {
    favorites: { where: { workerId }, select: { id: true } },
    recruiter: { select: { firstName: true, name: true, companyName: true, sector: true } },
    _count: { select: { applications: { where: { status: "ACCEPTED" } } } },
    applications: { where: { workerId }, select: { id: true, status: true, message: true, createdAt: true } },
  } as const;
}
export type WorkerMission = Prisma.MissionGetPayload<{ include: ReturnType<typeof workerMissionInclude> }>;
export function workerSearchWhere(input: WorkerSearch): Prisma.MissionWhereInput {
  return { ...publishedMissionWhere,
    ...(input.q ? { OR: [{ title: { contains: input.q } }, { description: { contains: input.q } }] } : {}),
    ...(input.category ? { category: input.category } : {}),
    ...(input.city ? { city: { contains: input.city } } : {}),
    ...(input.date ? { date: { gte: new Date(`${input.date}T00:00:00Z`), lt: new Date(Date.parse(`${input.date}T00:00:00Z`) + 86400000) } } : {}),
    ...(input.payMin !== undefined || input.payMax !== undefined ? { pay: { gte: input.payMin, lte: input.payMax } } : {}),
  };
}
