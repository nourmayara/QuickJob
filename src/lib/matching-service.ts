import "server-only";
import prisma from "./prisma";
import { localParts, missionInterval } from "./schedule-time";
import { createSkillExtractor } from "./skill-extraction";
import { DEFAULT_MATCHING_WEIGHTS, scoreMatch, type MatchingWeights } from "./matching-score";
import { publishedMissionWhere, workerMissionInclude, type WorkerMission } from "./worker-data";
import type { MatchResult } from "./matching-score";

const extractor = createSkillExtractor();

function monthsBetween(start: Date, end: Date) {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 2_629_746_000));
}

function experienceMonths(experiences: { startedAt: Date; endedAt: Date | null }[]) {
  if (!experiences.length) return null;
  const ranges = experiences
    .map(item => ({ start: item.startedAt, end: item.endedAt ?? new Date() }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());
  const merged: typeof ranges = [];
  for (const range of ranges) {
    const previous = merged.at(-1);
    if (previous && range.start <= previous.end) {
      if (range.end > previous.end) previous.end = range.end;
    } else merged.push({ ...range });
  }
  return merged.reduce((total, item) => total + monthsBetween(item.start, item.end), 0);
}

function declaredExperienceMonths(text: string | null) {
  if (!text) return null;
  const normalized = text.normalize("NFKD").replace(/\p{M}/gu, "").toLocaleLowerCase("fr");
  const durations = [
    ...[...normalized.matchAll(/(\d+(?:[.,]\d+)?)\s*(?:an|ans|annee|annees)\b/g)].map(match => Number(match[1].replace(",", ".")) * 12),
    ...[...normalized.matchAll(/(\d+)\s*mois\b/g)].map(match => Number(match[1])),
  ].filter(Number.isFinite);
  return durations.length ? Math.round(Math.max(...durations)) : null;
}

async function legacySkillKeys(text: string | null) {
  return text ? (await extractor.extract(text)).map(skill => skill.key) : [];
}

function matchInput(worker: {
  city: string | null;
  skills: string | null;
  experience: string | null;
  workerSkills: { skill: { key: string } }[];
  categoryPreferences: { category: string }[];
  workExperiences: { startedAt: Date; endedAt: Date | null }[];
  availabilities: { startAt: Date; endAt: Date; kind: string }[];
}, mission: {
  city: string | null;
  category: string | null;
  skills: string | null;
  requiredSkills: { skill: { key: string } }[];
  requiredExperienceMonths: number | null;
  date: Date | null;
  startTime: string | null;
  endTime: string | null;
}) {
  const interval = missionInterval(mission);
  return Promise.all([
    worker.workerSkills.length ? Promise.resolve(worker.workerSkills.map(item => item.skill.key)) : legacySkillKeys(worker.skills),
    mission.requiredSkills.length ? Promise.resolve(mission.requiredSkills.map(item => item.skill.key)) : legacySkillKeys(mission.skills),
  ]).then(([workerSkills, requiredSkills]) => ({
    worker: {
      city: worker.city,
      skillKeys: workerSkills,
      preferredCategories: worker.categoryPreferences.map(item => item.category),
      experienceMonths: experienceMonths(worker.workExperiences) ?? declaredExperienceMonths(worker.experience),
      availabilities: worker.availabilities,
    },
    mission: {
      city: mission.city,
      category: mission.category,
      requiredSkillKeys: requiredSkills,
      requiredExperienceMonths: mission.requiredExperienceMonths,
      startAt: interval?.startAt,
      endAt: interval?.endAt,
    },
  }));
}

const workerInclude = {
  workerSkills: { select: { skill: { select: { key: true } } } },
  categoryPreferences: { select: { category: true } },
  workExperiences: { select: { startedAt: true, endedAt: true } },
  availabilities: { select: { startAt: true, endAt: true, kind: true } },
} as const;

const missionInclude = {
  requiredSkills: { select: { required: true, skill: { select: { key: true, name: true } } } },
} as const;

export type RecommendedWorkerMission = WorkerMission & { match: MatchResult };
export const WORKER_RECOMMENDATION_WEIGHTS: MatchingWeights = { skills: 0.4, category: 0, location: 0.2, availability: 0.25, experience: 0.15 };

function upcomingPublishedWhere(now = new Date()) {
  const { date, time } = localParts(now);
  const today = new Date(`${date}T00:00:00Z`);
  return {
    AND: [publishedMissionWhere, { date: { not: null }, startTime: { not: null }, endTime: { not: null } }],
    OR: [{ date: { gt: today } }, { date: today, startTime: { gte: time } }],
  };
}

export async function recommendMissionsForWorker(workerId: number, limit = 20, weights: MatchingWeights = { ...WORKER_RECOMMENDATION_WEIGHTS }) {
  const worker = await prisma.user.findFirstOrThrow({ where: { id: workerId, role: "TRAVAILLEUR", suspended: false }, include: workerInclude });
  const missions = await prisma.mission.findMany({
    where: { ...upcomingPublishedWhere(), applications: { none: { workerId } } },
    include: { ...missionInclude, ...workerMissionInclude(workerId) },
    orderBy: [{ date: "asc" }, { createdAt: "desc" }],
  });
  const workerSkillKeys = new Set((worker.workerSkills.length ? worker.workerSkills.map(item => item.skill.key) : await legacySkillKeys(worker.skills)));
  const months = experienceMonths(worker.workExperiences) ?? declaredExperienceMonths(worker.experience);
  const accessible = missions.filter(mission => {
    if (mission._count.applications >= mission.capacity) return false;
    const interval = missionInterval(mission);
    if (!interval || worker.availabilities.some(slot => slot.kind === "UNAVAILABLE" && slot.startAt < interval.endAt && slot.endAt > interval.startAt)) return false;
    const mandatorySkills = mission.requiredSkills.filter(item => item.required).map(item => item.skill.key);
    if (mandatorySkills.some(key => !workerSkillKeys.has(key))) return false;
    if (mission.requiredExperienceMonths && (months === null || months < mission.requiredExperienceMonths)) return false;
    return true;
  });
  const recommendations: RecommendedWorkerMission[] = await Promise.all(accessible.map(async mission => ({
    ...mission,
    match: scoreMatch(await matchInput(worker, mission), weights),
  })));
  return recommendations.sort((a, b) => b.match.score - a.match.score || a.id - b.id).slice(0, Math.min(Math.max(limit, 1), 50));
}

export async function recommendWorkersForMission(recruiterId: number, missionId: number, limit = 20, weights: MatchingWeights = { ...DEFAULT_MATCHING_WEIGHTS }) {
  const mission = await prisma.mission.findFirst({ where: { id: missionId, recruiterId }, include: missionInclude });
  if (!mission) return null;
  const workers = await prisma.user.findMany({
    where: { role: "TRAVAILLEUR", suspended: false, recommendationOptIn: true, applications: { none: { missionId } } },
    include: workerInclude,
  });
  const recommendations = await Promise.all(workers.map(async worker => ({
    // Deliberately excludes email, phone, address, bio and free-form experience.
    worker: { id: worker.id, firstName: worker.firstName, name: worker.name, city: worker.city, avatarUrl: worker.avatarUrl },
    match: scoreMatch(await matchInput(worker, mission), weights),
  })));
  return recommendations.sort((a, b) => b.match.score - a.match.score || a.worker.id - b.worker.id).slice(0, Math.min(Math.max(limit, 1), 50));
}

export type ApplicantRecommendation = {
  applicationId: number;
  match: MatchResult;
  strengths: string[];
  missingSkills: string[];
};

export async function recommendApplicantsForMission(recruiterId: number, missionId: number, applicationIds?: number[]): Promise<ApplicantRecommendation[] | null> {
  const recommendations = await recommendApplicantsForMissions(recruiterId, [{ missionId, applicationIds }]);
  return recommendations.get(missionId) ?? null;
}

export async function recommendApplicantsForMissions(
  recruiterId: number,
  requests: { missionId: number; applicationIds?: number[] }[],
): Promise<Map<number, ApplicantRecommendation[]>> {
  if (!requests.length) return new Map();
  const missionIds = [...new Set(requests.map(request => request.missionId))];
  const requestedIds = requests.flatMap(request => request.applicationIds ?? []);
  const [missions, applications] = await Promise.all([
    prisma.mission.findMany({ where: { id: { in: missionIds }, recruiterId }, include: missionInclude }),
    prisma.application.findMany({
      where: {
        missionId: { in: missionIds },
        ...(requestedIds.length ? { id: { in: requestedIds } } : {}),
      },
      select: { id: true, missionId: true, worker: { include: workerInclude } },
    }),
  ]);
  const missionById = new Map(missions.map(mission => [mission.id, mission]));
  const grouped = new Map<number, ApplicantRecommendation[]>(missions.map(mission => [mission.id, []]));
  const recommendations = await Promise.all(applications.map(async application => {
    const mission = missionById.get(application.missionId);
    if (!mission) return null;
    const workerKeys = new Set(application.worker.workerSkills.length
      ? application.worker.workerSkills.map(item => item.skill.key)
      : await legacySkillKeys(application.worker.skills));
    const required = mission.requiredSkills.length
      ? mission.requiredSkills.map(item => ({ key: item.skill.key, name: item.skill.name }))
      : (await legacySkillKeys(mission.skills)).map(key => ({ key, name: key }));
    const match = scoreMatch(await matchInput(application.worker, mission), WORKER_RECOMMENDATION_WEIGHTS);
    return {
      missionId: application.missionId,
      applicationId: application.id,
      match,
      strengths: Object.values(match.criteria).filter(item => item.score > 0).sort((a, b) => b.points - a.points).map(item => item.explanation),
      missingSkills: required.filter(skill => !workerKeys.has(skill.key)).map(skill => skill.name),
    };
  }));
  for (const recommendation of recommendations) {
    if (!recommendation) continue;
    const { missionId, ...result } = recommendation;
    grouped.get(missionId)?.push(result);
  }
  for (const rows of grouped.values()) rows.sort((a, b) => b.match.score - a.match.score || a.applicationId - b.applicationId);
  return grouped;
}

export async function recommendReplacementCandidates(recruiterId: number, cancelledApplicationId: number, limit = 10) {
  const cancelled = await prisma.application.findFirst({ where: { id: cancelledApplicationId, status: "CANCELLED", cancelledBy: "WORKER", cancelledFromStatus: "ACCEPTED", mission: { recruiterId } }, select: { workerId: true, mission: { include: missionInclude } } });
  if (!cancelled) return null;
  const mission = cancelled.mission;
  const interval = missionInterval(mission);
  if (!interval || mission.status !== "PUBLISHED") return [];
  const workers = await prisma.user.findMany({
    where: { role: "TRAVAILLEUR", suspended: false, id: { not: cancelled.workerId }, OR: [{ recommendationOptIn: true }, { applications: { some: { missionId: mission.id, status: "PENDING" } } }], applications: { none: { missionId: mission.id, status: { in: ["ACCEPTED", "REJECTED", "CANCELLED"] } } } },
    include: { ...workerInclude, applications: { where: { missionId: mission.id, status: "PENDING" }, select: { id: true, status: true } } },
  });
  const confirmed = await prisma.application.findMany({ where: { workerId: { in: workers.map(worker => worker.id) }, status: "ACCEPTED", mission: { id: { not: mission.id }, status: { in: ["PUBLISHED", "FULL", "CLOSED", "IN_PROGRESS"] } } }, select: { workerId: true, mission: { select: { date: true, startTime: true, endTime: true } } } });
  const conflictingWorkers = new Set(confirmed.filter(item => { const other = missionInterval(item.mission); return other && other.startAt < interval.endAt && other.endAt > interval.startAt; }).map(item => item.workerId));
  const candidates = [];
  for (const worker of workers) {
    if (conflictingWorkers.has(worker.id)) continue;
    if (worker.availabilities.some(slot => slot.kind === "UNAVAILABLE" && slot.startAt < interval.endAt && slot.endAt > interval.startAt)) continue;
    const input = await matchInput(worker, mission);
    const workerKeys = new Set(input.worker.skillKeys);
    const mandatory = mission.requiredSkills.filter(item => item.required);
    if (mandatory.some(item => !workerKeys.has(item.skill.key))) continue;
    if (mission.requiredExperienceMonths && (input.worker.experienceMonths === null || input.worker.experienceMonths === undefined || input.worker.experienceMonths < mission.requiredExperienceMonths)) continue;
    const match = scoreMatch(input, WORKER_RECOMMENDATION_WEIGHTS);
    const existing = worker.applications[0];
    candidates.push({
      worker: { id: worker.id, firstName: worker.firstName, name: worker.name, city: worker.city, skills: worker.workerSkills.map(item => item.skill.key).join(", ") || worker.skills },
      applicationId: existing?.id ?? null,
      existingApplication: Boolean(existing),
      match,
      strengths: Object.values(match.criteria).filter(item => item.weight > 0 && item.score > 0).sort((a, b) => b.points - a.points).map(item => item.explanation),
    });
  }
  return candidates.sort((a, b) => Number(b.existingApplication) - Number(a.existingApplication) || b.match.score - a.match.score || a.worker.id - b.worker.id).slice(0, Math.min(Math.max(limit, 1), 20));
}
