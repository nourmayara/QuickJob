import "server-only";
import type { Prisma } from "@prisma/client";
import prisma from "./prisma";
import { localParts, scheduleInstant } from "./schedule-time";
import { activeScheduleStatuses } from "./schedule-service";
import { publishedMissionWhere, workerMissionInclude } from "./worker-data";
import { missionInclude, workerSelect } from "./recruiter-data";

export function upcomingMissionWhere(now = new Date()): Prisma.MissionWhereInput {
  const { date, time } = localParts(now);
  const civilDate = new Date(`${date}T00:00:00Z`);
  return { status: { in: activeScheduleStatuses }, startTime: { not: null }, endTime: { not: null }, OR: [{ date: { gt: civilDate } }, { date: civilDate, startTime: { gte: time } }] };
}
export async function workerDashboardData(workerId: number) {
  return prisma.$transaction(async tx => {
    const profile = await tx.user.findUniqueOrThrow({ where: { id: workerId }, select: { city: true, skills: true, languages: true } });
    const upcomingWhere = { ...upcomingMissionWhere(), applications: { some: { workerId, status: "ACCEPTED" } } } satisfies Prisma.MissionWhereInput;
    const availableWhere = { AND: [publishedMissionWhere, upcomingMissionWhere()], applications: { none: { workerId } } } satisfies Prisma.MissionWhereInput;
    const completedWhere = { status: "COMPLETED", applications: { some: { workerId, status: "ACCEPTED" } } } satisfies Prisma.MissionWhereInput;
    const [published, applications, selected, pending, completed, rating, upcomingCount, upcoming, nearby] = await Promise.all([
      tx.mission.count({ where: availableWhere }),
      tx.application.count({ where: { workerId } }),
      tx.application.count({ where: { workerId, status: "ACCEPTED" } }),
      tx.application.count({ where: { workerId, status: "PENDING", mission: { status: { in: ["PUBLISHED", "FULL", "CLOSED"] } } } }),
      tx.mission.aggregate({ where: completedWhere, _count: { id: true, pay: true }, _sum: { pay: true } }),
      tx.review.aggregate({ where: { recipientId: workerId }, _avg: { rating: true }, _count: { rating: true } }),
      tx.mission.count({ where: upcomingWhere }),
      tx.mission.findMany({ where: upcomingWhere, select: { id: true, title: true, date: true, startTime: true, endTime: true, city: true, applications: { where: { workerId }, select: { id: true } } }, orderBy: [{ date: "asc" }, { startTime: "asc" }, { id: "asc" }], take: 3 }),
      tx.mission.findMany({ where: { ...availableWhere, ...(profile.city?.trim() ? { city: { contains: profile.city.trim() } } : {}) }, include: workerMissionInclude(workerId), orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 4 }),
    ]);
    const localRecommendations = !!profile.city?.trim() && nearby.length > 0;
    const missions = nearby.length || !profile.city?.trim() ? nearby : await tx.mission.findMany({ where: availableWhere, include: workerMissionInclude(workerId), orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 4 });
    return { profile, published, applications, selected, pending, completed: completed._count.id, declaredPay: completed._sum.pay ?? 0, missingPay: completed._count.id - completed._count.pay, averageRating: rating._avg.rating, reviewCount: rating._count.rating, upcomingCount, upcoming, missions, localRecommendations };
  });
}
export async function recruiterDashboardData(recruiterId: number, now = new Date()) {
  const scope = { recruiterId };
  const [year, month] = localParts(now).date.slice(0, 7).split("-").map(Number);
  const months = Array.from({ length: 6 }, (_, i) => {
    const date = new Date(Date.UTC(year, month - 6 + i, 1));
    const next = new Date(Date.UTC(year, month - 5 + i, 1));
    return {
      key: date.toISOString().slice(0, 7),
      label: date.toLocaleDateString("fr-FR", { month: "short", year: "numeric", timeZone: "UTC" }),
      start: scheduleInstant(date.toISOString().slice(0, 10), "00:00"),
      end: i === 5 ? now : scheduleInstant(next.toISOString().slice(0, 10), "00:00"),
    };
  });
  return prisma.$transaction(async tx => {
    const [active, applications, selected, completed, missions, recent, upcoming, missionGroups, categoryGroups, applicationGroups, monthlyApplications] = await Promise.all([
      tx.mission.count({ where: { ...scope, status: { in: activeScheduleStatuses } } }),
      tx.application.count({ where: { mission: scope } }),
      tx.user.count({ where: { applications: { some: { status: "ACCEPTED", mission: { ...scope, status: { in: activeScheduleStatuses } } } } } }),
      tx.mission.count({ where: { ...scope, status: "COMPLETED" } }),
      tx.mission.findMany({ where: scope, include: missionInclude, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 5 }),
      tx.application.findMany({ where: { mission: scope }, include: { worker: { select: workerSelect }, mission: { select: { title: true } } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 4 }),
      tx.mission.findMany({ where: { ...scope, ...upcomingMissionWhere() }, include: missionInclude, orderBy: [{ date: "asc" }, { startTime: "asc" }, { id: "asc" }], take: 3 }),
      tx.mission.groupBy({ by: ["status"], where: scope, _count: { _all: true } }),
      tx.mission.groupBy({ by: ["category"], where: scope, _count: { _all: true }, orderBy: [{ _count: { id: "desc" } }, { category: "asc" }], take: 8 }),
      tx.application.groupBy({ by: ["status"], where: { mission: scope }, _count: { _all: true } }),
      tx.application.findMany({ where: { mission: scope, createdAt: { gte: months[0].start, lt: now } }, select: { createdAt: true } }),
    ]);
    const totalMissions = missionGroups.reduce((sum, g) => sum + g._count._all, 0);
    const hired = applicationGroups.find(g => g.status === "ACCEPTED")?._count._all || 0;
    const pending = applicationGroups.find(g => g.status === "PENDING")?._count._all || 0;
    return { active, applications, selected, completed, missions, recent, upcoming, hired, pending, totalMissions,
      charts: {
        applications: months.map(m => ({ key: m.key, label: m.label, value: monthlyApplications.filter(application => application.createdAt >= m.start && application.createdAt < m.end).length })),
        missions: [{ label: "Actives", value: active, color: "#1768ff" }, { label: "Terminées", value: completed, color: "#ffcc28" }, { label: "Autres statuts", value: totalMissions - active - completed, color: "#ae8af5" }],
        categories: distribution(categoryGroups.map(g => ({ label: g.category, count: g._count._all })), totalMissions, "Autres catégories"),
      },
    };
  });
}
type ChartPoint = { label: string; value: number };
function distribution(rows: { label: string | null; count: number }[], total: number, otherLabel: string): ChartPoint[] {
  const values = new Map<string, number>();
  for (const row of rows) { const label = row.label?.trim() || "Non renseignée"; values.set(label, (values.get(label) || 0) + row.count); }
  const result = [...values].map(([label, value]) => ({ label, value }));
  const remainder = total - rows.reduce((sum, row) => sum + row.count, 0);
  if (remainder > 0) result.push({ label: otherLabel, value: remainder });
  return result;
}
export async function adminDashboardData(now = new Date()) {
  const localMonth = localParts(now).date.slice(0, 7);
  const [year, month] = localMonth.split("-").map(Number);
  const months = Array.from({ length: 6 }, (_, i) => {
    const date = new Date(Date.UTC(year, month - 6 + i, 1));
    const next = new Date(Date.UTC(year, month - 5 + i, 1));
    return { key: date.toISOString().slice(0, 7), label: date.toLocaleDateString("fr-FR", { month: "short", year: "numeric", timeZone: "UTC" }), start: scheduleInstant(date.toISOString().slice(0, 10), "00:00"), end: i === 5 ? now : scheduleInstant(next.toISOString().slice(0, 10), "00:00") };
  });
  return prisma.$transaction(async tx => {
    const [usersByRole, missionsByStatus, applicationsByStatus, suspended, categories, locations, registrations, reportGroups, pendingRecruiters] = await Promise.all([
      tx.user.groupBy({ by: ["role"], _count: { _all: true }, orderBy: { role: "asc" } }),
      tx.mission.groupBy({ by: ["status"], _count: { _all: true }, orderBy: { status: "asc" } }),
      tx.application.groupBy({ by: ["status"], _count: { _all: true }, orderBy: { status: "asc" } }),
      tx.user.count({ where: { suspended: true } }),
      tx.mission.groupBy({ by: ["category"], _count: { _all: true }, orderBy: [{ _count: { id: "desc" } }, { category: "asc" }], take: 10 }),
      tx.mission.groupBy({ by: ["city"], _count: { _all: true }, orderBy: [{ _count: { id: "desc" } }, { city: "asc" }], take: 10 }),
      tx.user.findMany({ where: { createdAt: { gte: months[0].start, lt: now } }, select: { createdAt: true } }),
      tx.report.groupBy({by:["status"],_count:{_all:true}}),
      tx.recruiterVerification.count({where:{status:"EN_ATTENTE",user:{role:"RECRUTEUR"}}}),
    ]);
    const users = usersByRole.reduce((sum, g) => sum + g._count._all, 0);
    const missions = missionsByStatus.reduce((sum, g) => sum + g._count._all, 0);
    const applications = applicationsByStatus.reduce((sum, g) => sum + g._count._all, 0);
    const statusCount = (status: string) => missionsByStatus.find(g => g.status === status)?._count._all || 0;
    return { users, missions, applications, suspended,
      usersByRole: usersByRole.map(g => ({ role: g.role, count: g._count._all })),
      missionsByStatus: missionsByStatus.map(g => ({ status: g.status, count: g._count._all })),
      applicationsByStatus: applicationsByStatus.map(g => ({ status: g.status, count: g._count._all })),
      pendingRecruiters,
      reports: { available: true, total: reportGroups.reduce((n,g)=>n+g._count._all,0), byStatus:reportGroups.map(g=>({status:g.status,count:g._count._all})), explanation: "Tous les signalements enregistrés, y compris les dossiers traités." },
      charts: { registrations: months.map(m => ({ key: m.key, label: m.label, value: registrations.filter(user => user.createdAt >= m.start && user.createdAt < m.end).length })),
        categories: distribution(categories.map(g => ({ label: g.category, count: g._count._all })), missions, "Autres catégories"),
        locations: distribution(locations.map(g => ({ label: g.city, count: g._count._all })), missions, "Autres villes"),
        outcomes: [{ label: "Terminées", value: statusCount("COMPLETED") }, { label: "Annulées", value: statusCount("CANCELLED") }] },
    };
  });
}
