import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import env from "@next/env";
env.loadEnvConfig(process.cwd());
const db = new PrismaClient(), base = process.env.TEST_BASE_URL || "http://localhost:3200", prefix = `ai-relevance-${Date.now()}`;
const users = [], missions = [];
async function call(path, expected, actor, method = "GET", body) { const response = await fetch(base + path, { method, redirect: "manual", headers: { ...(actor ? { Cookie: actor.cookie } : {}), "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) }); const text = await response.text(); assert.equal(response.status, expected, `${method} ${path}: ${response.status} ${text.slice(0, 250)}`); return response.headers.get("content-type")?.includes("json") ? JSON.parse(text) : text; }
async function account(label, role, data = {}) { const response = await fetch(base + "/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Pertinence", firstName: label, email: `${prefix}-${label}@example.invalid`, phone: "+216 12345678", password: "test-password123", confirmPassword: "test-password123", acceptTerms: true, role, ...(role === "RECRUTEUR" ? { recruiterType: "INDIVIDUAL" } : {}) }) }); assert.equal(response.status, 201); const value = await response.json(); users.push(value.id); if (Object.keys(data).length) await db.user.update({ where: { id: value.id }, data }); return { ...value, cookie: response.headers.get("set-cookie").split(";")[0] }; }
async function skill(name) { const key = name.normalize("NFKD").replace(/\p{M}/gu, "").toLocaleLowerCase("fr"); return db.skill.upsert({ where: { key }, update: {}, create: { key, name } }); }
async function available(workerId, date = "2035-09-10") { await db.availability.create({ data: { workerId, kind: "AVAILABLE", note: prefix, startAt: new Date(`${date}T08:00:00Z`), endAt: new Date(`${date}T12:00:00Z`) } }); }
async function mission(recruiterId, name, city, required, date = "2035-09-10") { const value = await db.mission.create({ data: { recruiterId, title: `${prefix}-${name}`, description: "Service en salle et prise de commandes.", status: "PUBLISHED", category: "Restauration", city, date: new Date(`${date}T00:00:00Z`), startTime: "09:00", endTime: "13:00", capacity: 3, requiredExperienceMonths: 12 } }); missions.push(value.id); for (const [skillId, isRequired] of required) await db.missionSkill.create({ data: { missionId: value.id, skillId, required: isRequired } }); return value; }
try {
  const recruiter = await account("Recruteur", "RECRUTEUR"), worker = await account("Travailleur", "TRAVAILLEUR", { city: "Tunis", experience: "2 ans en restauration", recommendationOptIn: true });
  await db.recruiterVerification.update({ where: { userId: recruiter.id }, data: { status: "APPROUVE" } });
  const service = await skill("Service en salle"), commands = await skill("Prise de commandes"), sales = await skill("Vente");
  await db.workerSkill.createMany({ data: [{ workerId: worker.id, skillId: service.id }, { workerId: worker.id, skillId: commands.id }] }); await available(worker.id);

  const extractionCases = [
    ["restauration", "Serveuse, j’ai pris les commandes, assuré le service en salle et tenu la caisse.", ["Service en salle", "Prise de commandes", "Encaissement"]],
    ["informatique", "Technicien support informatique, j’ai géré des tickets et installé des logiciels.", ["Support informatique", "Gestion de tickets", "Installation de logiciels"]],
    ["commerce", "Conseillère de vente, j’ai conseillé les clients, mis les produits en rayon et géré les stocks.", ["Vente", "Conseil client", "Mise en rayon", "Gestion des stocks"]],
    ["logistique", "J’ai préparé des commandes, fait du picking et assuré le chargement et déchargement.", ["Préparation de commandes", "Manutention"]],
  ];
  for (const [domain, text, expected] of extractionCases) { const result = await call("/api/travailleur/competences/analyser", 200, worker, "POST", { experience: text }); const names = result.skills.map(item => item.name); for (const name of expected) assert(names.includes(name), `${domain}: ${name} absent`); assert(result.skills.every(item => item.evidence && text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().includes(item.evidence.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase()))); console.log(`extraction ${domain}: ${names.join(", ")}`); }

  const perfect = await mission(recruiter.id, "parfaite", "Tunis", [[service.id, true], [commands.id, true]]);
  const remote = await mission(recruiter.id, "eloignee", "Sfax", [[service.id, true], [commands.id, true]]);
  const partial = await mission(recruiter.id, "partielle", "Sfax", [[service.id, true], [sales.id, false]]);
  const expired = await mission(recruiter.id, "expiree", "Tunis", [[service.id, true]], "2025-01-10");
  const recommendations = await call("/api/travailleur/recommandations?limit=50", 200, worker); const relevant = recommendations.filter(item => missions.includes(item.id));
  const byId = new Map(relevant.map(item => [item.id, item.match.score]));
  assert.deepEqual(relevant.slice(0, 3).map(item => item.id), [perfect.id, remote.id, partial.id]); assert.equal(byId.get(perfect.id), 100); assert.equal(byId.get(remote.id), 80); assert.equal(byId.get(partial.id), 60); assert(!byId.has(expired.id));
  console.log(`missions: parfaite ${byId.get(perfect.id)}, éloignée ${byId.get(remote.id)}, partielle ${byId.get(partial.id)}, expirée exclue`);

  const candidatePerfect = await account("CandidatParfait", "TRAVAILLEUR", { city: "Tunis", experience: "2 ans en restauration" });
  const candidateRemote = await account("CandidatEloigne", "TRAVAILLEUR", { city: "Sfax", experience: "2 ans en restauration" });
  const candidatePartial = await account("CandidatPartiel", "TRAVAILLEUR", { city: "Sfax", experience: "6 mois en restauration" });
  for (const candidate of [candidatePerfect, candidateRemote]) await db.workerSkill.createMany({ data: [{ workerId: candidate.id, skillId: service.id }, { workerId: candidate.id, skillId: commands.id }] });
  await db.workerSkill.create({ data: { workerId: candidatePartial.id, skillId: service.id } });
  for (const candidate of [candidatePerfect, candidateRemote, candidatePartial]) { await available(candidate.id); await db.application.create({ data: { missionId: perfect.id, workerId: candidate.id, status: "PENDING" } }); }
  const candidatePage = await call(`/recruteur/candidatures?mission=${perfect.id}&sort=ai`, 200, recruiter); const positions = ["CandidatParfait", "CandidatEloigne", "CandidatPartiel"].map(name => candidatePage.indexOf(name)); assert(positions[0] < positions[1] && positions[1] < positions[2]); const renderedScores = [...candidatePage.matchAll(/<strong>(\d+)(?:<!-- -->)?%<\/strong>/g)].map(match => Number(match[1])); assert([100, 80, 53].every(score => renderedScores.includes(score)), `scores rendus: ${renderedScores}`);
  console.log("candidats: parfait 100 > éloigné 80 > partiel 53");

  const cancelledWorker = await account("Annule", "TRAVAILLEUR"); const existing = await account("Existant", "TRAVAILLEUR", { city: "Sfax", experience: "2 ans en restauration" }); const discovered = await account("Decouvert", "TRAVAILLEUR", { city: "Tunis", experience: "2 ans en restauration", recommendationOptIn: true });
  const replacementMission = await mission(recruiter.id, "remplacement", "Tunis", [[service.id, true], [commands.id, true]]); await db.mission.update({ where: { id: replacementMission.id }, data: { status: "PUBLISHED", capacity: 1 } });
  for (const candidate of [existing, discovered]) { await db.workerSkill.createMany({ data: [{ workerId: candidate.id, skillId: service.id }, { workerId: candidate.id, skillId: commands.id }] }); await available(candidate.id); }
  const cancelledApp = await db.application.create({ data: { missionId: replacementMission.id, workerId: cancelledWorker.id, status: "CANCELLED", cancelledBy: "WORKER", cancelledFromStatus: "ACCEPTED", cancelledAt: new Date() } }); await db.application.create({ data: { missionId: replacementMission.id, workerId: existing.id, status: "PENDING" } });
  const replacementPage = await call(`/recruteur/candidatures/${cancelledApp.id}/remplacement`, 200, recruiter); assert(replacementPage.indexOf("Existant") < replacementPage.indexOf("Decouvert")); const replacementScores = [...replacementPage.matchAll(/<strong>(\d+)(?:<!-- -->)?%<\/strong>/g)].map(match => Number(match[1])); assert([80, 100].every(score => replacementScores.includes(score)), `scores remplaçants: ${replacementScores}`);
  console.log("remplaçants: candidature existante 80 priorisée avant profil découvert 100, conformément à la règle métier");
  console.log("Pertinence IA: scénarios attendus et résultats obtenus concordent.");
} finally {
  await db.replacementOffer.deleteMany({ where: { missionId: { in: missions } } }); await db.notification.deleteMany({ where: { missionId: { in: missions } } }); await db.application.deleteMany({ where: { missionId: { in: missions } } }); await db.missionSkill.deleteMany({ where: { missionId: { in: missions } } }); await db.mission.deleteMany({ where: { id: { in: missions } } });
  await db.workerSkill.deleteMany({ where: { workerId: { in: users } } }); await db.availability.deleteMany({ where: { workerId: { in: users } } }); await db.session.deleteMany({ where: { userId: { in: users } } }); await db.recruiterVerification.deleteMany({ where: { userId: { in: users } } }); await db.notification.deleteMany({ where: { userId: { in: users } } }); await db.user.deleteMany({ where: { id: { in: users } } }); await db.$disconnect();
}
