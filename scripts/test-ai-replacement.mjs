import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { PrismaClient } from "@prisma/client";
import env from "@next/env";
env.loadEnvConfig(process.cwd());
const db = new PrismaClient(), base = process.env.TEST_BASE_URL || "http://localhost:3200";
const prefix = `ai-replacement-${Date.now()}`; const userIds = []; let missionId;
async function call(path, expected, actor, method = "GET", body) { const started = performance.now(); const response = await fetch(base + path, { method, redirect: "manual", headers: { ...(actor ? { Cookie: actor.cookie } : {}), "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) }); const text = await response.clone().text(); assert.equal(response.status, expected, `${method} ${path}: ${response.status}: ${text.slice(0, 300)}`); return { response, data: response.headers.get("content-type")?.includes("json") ? JSON.parse(text) : text, ms: performance.now() - started }; }
async function account(label, role) { const { response, data } = await call("/api/auth/register", 201, null, "POST", { name: "Audit", firstName: label, email: `${prefix}-${label}@example.invalid`, phone: "+216 12345678", password: "test-password123", confirmPassword: "test-password123", acceptTerms: true, role, ...(role === "RECRUTEUR" ? { recruiterType: "INDIVIDUAL" } : {}) }); const actor = { ...data, cookie: response.headers.get("set-cookie").split(";")[0] }; userIds.push(actor.id); return actor; }
try {
  const recruiter = await account("recruiter", "RECRUTEUR"), cancelledWorker = await account("cancelled", "TRAVAILLEUR"), candidate = await account("candidate", "TRAVAILLEUR"), intruder = await account("intruder", "TRAVAILLEUR");
  await db.recruiterVerification.update({ where: { userId: recruiter.id }, data: { status: "APPROUVE" } });
  const date = new Date("2035-08-20T00:00:00Z");
  const mission = await db.mission.create({ data: { recruiterId: recruiter.id, title: `${prefix} mission`, description: "Service en salle et prise de commandes.", status: "FULL", category: "Restauration", city: "Tunis", date, startTime: "09:00", endTime: "13:00", capacity: 1, skills: "Service en salle, prise de commandes" } }); missionId = mission.id;
  const cancelled = await db.application.create({ data: { missionId, workerId: cancelledWorker.id, status: "ACCEPTED" } });
  const candidateApplication = await db.application.create({ data: { missionId, workerId: candidate.id, status: "PENDING" } });
  await db.user.update({ where: { id: candidate.id }, data: { city: "Tunis", skills: "Service en salle, prise de commandes", experience: "2 ans en restauration" } });
  await db.availability.create({ data: { workerId: candidate.id, kind: "AVAILABLE", note: "audit", startAt: new Date("2035-08-20T08:00:00Z"), endAt: new Date("2035-08-20T12:00:00Z") } });
  await call("/api/recruteur/remplacements", 401, null, "POST", { cancelledApplicationId: cancelled.id, candidateId: candidate.id });
  await call("/api/recruteur/remplacements", 403, candidate, "POST", { cancelledApplicationId: cancelled.id, candidateId: candidate.id });
  const withdrawal = await call(`/api/applications/${cancelled.id}`, 200, cancelledWorker, "PATCH", { status: "CANCELLED" });
  const cancelledStored = await db.application.findUniqueOrThrow({ where: { id: cancelled.id } });
  assert.equal(cancelledStored.cancelledFromStatus, "ACCEPTED"); assert.equal(cancelledStored.cancelledBy, "WORKER"); assert.equal(cancelledStored.status, "CANCELLED");
  assert.equal((await db.mission.findUniqueOrThrow({ where: { id: missionId } })).status, "PUBLISHED");
  assert(await db.application.findFirst({ where: { id: cancelled.id, mission: { recruiterId: recruiter.id }, status: "CANCELLED", cancelledBy: "WORKER", cancelledFromStatus: "ACCEPTED" } }));
  const search = await call(`/recruteur/candidatures/${cancelled.id}/remplacement`, 200, recruiter);
  assert(search.data.includes(candidate.firstName));
  const proposal = await call("/api/recruteur/remplacements", 201, recruiter, "POST", { cancelledApplicationId: cancelled.id, candidateId: candidate.id });
  const offer = await db.replacementOffer.findUniqueOrThrow({ where: { id: proposal.data.id } }); assert.equal(offer.status, "PENDING");
  assert(await db.notification.findFirst({ where: { userId: candidate.id, applicationId: candidateApplication.id, message: { contains: "remplacer" } } }));
  await call(`/api/remplacements/${offer.id}`, 404, intruder, "PATCH", { status: "ACCEPTED" });
  await call(`/api/remplacements/${offer.id}`, 403, recruiter, "PATCH", { status: "ACCEPTED" });
  const acceptance = await call(`/api/remplacements/${offer.id}`, 200, candidate, "PATCH", { status: "ACCEPTED" });
  assert.equal((await db.application.findUniqueOrThrow({ where: { id: candidateApplication.id } })).status, "ACCEPTED");
  assert.equal((await db.replacementOffer.findUniqueOrThrow({ where: { id: offer.id } })).status, "ACCEPTED");
  assert.equal((await db.mission.findUniqueOrThrow({ where: { id: missionId } })).status, "FULL");
  assert(await db.notification.findFirst({ where: { userId: recruiter.id, message: { contains: "remplacement" } } }));
  console.log(`remplacement: annulation ${withdrawal.ms.toFixed(1)} ms, recherche ${search.ms.toFixed(1)} ms, proposition ${proposal.ms.toFixed(1)} ms, acceptation ${acceptance.ms.toFixed(1)} ms`);
  console.log("Remplacement E2E: permissions, notifications, confirmation et capacité validés.");
} finally {
  if (missionId) { await db.replacementOffer.deleteMany({ where: { missionId } }); await db.notification.deleteMany({ where: { missionId } }); await db.application.deleteMany({ where: { missionId } }); await db.mission.deleteMany({ where: { id: missionId } }); }
  await db.availability.deleteMany({ where: { workerId: { in: userIds } } }); await db.session.deleteMany({ where: { userId: { in: userIds } } }); await db.recruiterVerification.deleteMany({ where: { userId: { in: userIds } } }); await db.notification.deleteMany({ where: { userId: { in: userIds } } }); await db.user.deleteMany({ where: { id: { in: userIds } } }); await db.$disconnect();
}
