import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import env from "@next/env";
env.loadEnvConfig(process.cwd());
const db = new PrismaClient(), base = process.env.TEST_BASE_URL || "http://localhost:3200", prefix = `ai-security-${Date.now()}`; const ids = []; let missionId;
async function call(path, expected, actor, method = "GET", body) { const response = await fetch(base + path, { method, redirect: "manual", headers: { ...(actor ? { Cookie: actor.cookie } : {}), "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) }); const text = await response.text(); assert.equal(response.status, expected, `${method} ${path}: ${response.status} ${text.slice(0, 200)}`); assert(!/password|sessionId|token/i.test(text), "Donnée sensible exposée"); return response.headers.get("content-type")?.includes("json") ? JSON.parse(text) : text; }
async function account(label, role) { const response = await fetch(base + "/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Sécurité", firstName: label, email: `${prefix}-${label}@example.invalid`, phone: "+216 12345678", password: "test-password123", confirmPassword: "test-password123", acceptTerms: true, role, ...(role === "RECRUTEUR" ? { recruiterType: "INDIVIDUAL" } : {}) }) }); assert.equal(response.status, 201); const data = await response.json(); ids.push(data.id); return { ...data, cookie: response.headers.get("set-cookie").split(";")[0] }; }
try {
  const worker = await account("worker", "TRAVAILLEUR"), recruiter = await account("recruiter", "RECRUTEUR"), other = await account("other", "RECRUTEUR");
  await db.recruiterVerification.updateMany({ where: { userId: { in: [recruiter.id, other.id] } }, data: { status: "APPROUVE" } });
  const mission = await db.mission.create({ data: { recruiterId: recruiter.id, title: `${prefix} mission`, description: "Support informatique et gestion de tickets.", status: "PUBLISHED", city: "Tunis", date: new Date("2035-11-10T00:00:00Z"), startTime: "09:00", endTime: "13:00", capacity: 1, skills: "Support informatique, gestion de tickets" } }); missionId = mission.id;
  await call("/api/travailleur/competences/analyser", 401, null, "POST", { experience: "Technicien support informatique pendant deux ans." });
  await call("/api/travailleur/competences/analyser", 403, recruiter, "POST", { experience: "Technicien support informatique pendant deux ans." });
  await call("/api/travailleur/competences/analyser", 400, worker, "POST", { experience: "" });
  const extraction = await call("/api/travailleur/competences/analyser", 200, worker, "POST", { experience: "Technicien support informatique, j’ai géré des tickets et installé des logiciels." });
  assert(extraction.skills.some(item => item.name === "Support informatique") && extraction.skills.every(item => item.evidence));
  await call("/api/travailleur/recommandations", 401, null);
  await call("/api/travailleur/recommandations", 403, recruiter);
  assert(Array.isArray(await call("/api/travailleur/recommandations", 200, worker)));
  await call(`/api/recruteur/missions/${mission.id}/recommandations`, 403, worker);
  await call(`/api/recruteur/missions/${mission.id}/recommandations`, 404, other);
  assert(Array.isArray(await call(`/api/recruteur/missions/${mission.id}/recommandations`, 200, recruiter)));
  console.log("Sécurité IA: rôles, propriété, texte vide, profil incomplet et DTO sans secrets validés.");
} finally {
  if (missionId) { await db.application.deleteMany({ where: { missionId } }); await db.notification.deleteMany({ where: { missionId } }); await db.mission.deleteMany({ where: { id: missionId } }); }
  await db.session.deleteMany({ where: { userId: { in: ids } } }); await db.recruiterVerification.deleteMany({ where: { userId: { in: ids } } }); await db.notification.deleteMany({ where: { userId: { in: ids } } }); await db.user.deleteMany({ where: { id: { in: ids } } }); await db.$disconnect();
}
