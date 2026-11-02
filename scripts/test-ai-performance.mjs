import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { PrismaClient } from "@prisma/client";
import env from "@next/env";
env.loadEnvConfig(process.cwd());
const db = new PrismaClient(), base = process.env.TEST_BASE_URL || "http://localhost:3200", prefix = `ai-perf-${Date.now()}`;
const userIds = [], missionIds = [];
async function timed(path, cookie) { const started = performance.now(); const response = await fetch(base + path, { headers: { Cookie: cookie } }); const body = await response.text(); assert.equal(response.status, 200, `${path}: ${response.status} ${body.slice(0, 200)}`); return performance.now() - started; }
async function account(label, role) { const response = await fetch(base + "/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Performance", firstName: label, email: `${prefix}-${label}@example.invalid`, phone: "+216 12345678", password: "test-password123", confirmPassword: "test-password123", acceptTerms: true, role, ...(role === "RECRUTEUR" ? { recruiterType: "INDIVIDUAL" } : {}) }) }); assert.equal(response.status, 201); const data = await response.json(); userIds.push(data.id); return { ...data, cookie: response.headers.get("set-cookie").split(";")[0] }; }
try {
  const recruiter = await account("recruiter", "RECRUTEUR"), worker = await account("worker", "TRAVAILLEUR");
  await db.recruiterVerification.update({ where: { userId: recruiter.id }, data: { status: "APPROUVE" } });
  await db.user.update({ where: { id: worker.id }, data: { city: "Tunis", skills: "Service en salle, prise de commandes", experience: "2 ans en restauration" } });
  let previous = 0;
  for (const size of [10, 100, 1000]) {
    const rows = Array.from({ length: size - previous }, (_, index) => ({ recruiterId: recruiter.id, title: `${prefix}-mission-${previous + index}`, description: "Service en salle et prise de commandes pour un événement.", status: "PUBLISHED", category: "Restauration", city: index % 2 ? "Sfax" : "Tunis", date: new Date("2035-09-10T00:00:00Z"), startTime: "09:00", endTime: "13:00", capacity: 2, skills: "Service en salle, prise de commandes" }));
    await db.mission.createMany({ data: rows }); previous = size;
    const ms = await timed("/api/travailleur/recommandations?limit=50", worker.cookie);
    console.log(`recommandations missions ${size}: ${ms.toFixed(1)} ms`);
  }
  const candidateMission = await db.mission.create({ data: { recruiterId: recruiter.id, title: `${prefix}-candidates`, description: "Vente et conseil client.", status: "PUBLISHED", city: "Tunis", date: new Date("2035-10-10T00:00:00Z"), startTime: "09:00", endTime: "13:00", capacity: 1000, skills: "Vente, conseil client" } }); missionIds.push(candidateMission.id);
  previous = 0;
  for (const size of [10, 100, 1000]) {
    const users = Array.from({ length: size - previous }, (_, index) => ({ name: "Candidat", firstName: `P${previous + index}`, email: `${prefix}-candidate-${previous + index}@example.invalid`, phone: "", password: "audit-only", role: "TRAVAILLEUR", city: "Tunis", skills: index % 2 ? "Vente" : "Vente, conseil client", experience: "1 an en vente" }));
    await db.user.createMany({ data: users }); const created = await db.user.findMany({ where: { email: { in: users.map(item => item.email) } }, select: { id: true } }); userIds.push(...created.map(item => item.id));
    await db.application.createMany({ data: created.map(item => ({ missionId: candidateMission.id, workerId: item.id, status: "PENDING" })) });
    previous = size;
    const ms = await timed(`/recruteur/candidatures?mission=${candidateMission.id}&sort=ai`, recruiter.cookie);
    console.log(`page candidats ${size}: ${ms.toFixed(1)} ms`);
  }
} finally {
  const owned = await db.mission.findMany({ where: { recruiterId: userIds[0] }, select: { id: true } }); const ids = owned.map(item => item.id);
  await db.replacementOffer.deleteMany({ where: { missionId: { in: ids } } }); await db.notification.deleteMany({ where: { missionId: { in: ids } } }); await db.application.deleteMany({ where: { missionId: { in: ids } } }); await db.mission.deleteMany({ where: { id: { in: ids } } });
  await db.session.deleteMany({ where: { userId: { in: userIds } } }); await db.recruiterVerification.deleteMany({ where: { userId: { in: userIds } } }); await db.notification.deleteMany({ where: { userId: { in: userIds } } }); await db.user.deleteMany({ where: { id: { in: userIds } } }); await db.$disconnect();
}
