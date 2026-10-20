import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const db = new PrismaClient();
const base = process.env.TEST_BASE_URL || "http://localhost:3100";
const prefix = `worker-e2e-${Date.now()}-`;
const users = [];
let checks = 0;
function noSecrets(value) {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) { assert.ok(!/password|token|secret|sessionId/i.test(key), `Sensitive field ${key}`); noSecrets(child); }
}
async function request(route, expected, actor, method = "GET", body) {
  const response = await fetch(base + route, { method, redirect: "manual", headers: { ...(actor ? { Cookie: actor.cookie } : {}), ...(body !== undefined ? { "Content-Type": "application/json" } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.clone().text();
  const streamed404 = expected === 404 && response.status === 200 && text.includes("NEXT_HTTP_ERROR_FALLBACK;404");
  assert.ok(response.status === expected || streamed404, `${method} ${route}: ${response.status}, expected ${expected}; ${text.slice(0, 300)}`);
  if (response.headers.get("content-type")?.includes("application/json")) noSecrets(await response.clone().json());
  checks++; return response;
}
async function account(suffix, role) {
  const body = { name: "Recette", firstName: suffix, phone: "+216 12345678", email: `${prefix}${suffix}@example.invalid`, password: "test-password123", confirmPassword: "test-password123", acceptTerms: true, role, ...(role === "RECRUTEUR" ? { recruiterType: "INDIVIDUAL" } : {}) };
  const response = await request("/api/auth/register", 201, null, "POST", body);
  const actor = { ...await response.json(), cookie: response.headers.get("set-cookie").split(";")[0] };
  users.push(actor); return actor;
}
try {
  const recruiter = await account("Recruteur", "RECRUTEUR");
  const workers = await Promise.all(["Amira", "Sami", "Lina"].map(name => account(name, "TRAVAILLEUR")));
  const [a, b, c] = workers;
  for (const route of ["/dashboard/travailleur", "/dashboard/travailleur/profil", "/dashboard/travailleur/missions", "/dashboard/travailleur/candidatures"]) {
    await request(route, 307);
    await request(route, 307, recruiter);
    await request(route, 200, a);
  }
  await request("/api/travailleur/profil", 401);
  await request("/api/travailleur/profil", 403, recruiter);
  for (const worker of workers) {
    const profile = { city: "Tunis", skills: "Service, accueil", experience: `${worker.firstName} : deux ans en restauration`, languages: "Arabe, français", bio: "Disponible pour des missions ponctuelles." };
    await request("/api/travailleur/profil", 200, worker, "PATCH", profile);
    const stored = await (await request("/api/travailleur/profil", 200, worker)).json();
    assert.equal(stored.experience, profile.experience); assert.equal(stored.languages, profile.languages); checks += 2;
    await request("/api/travailleur/profil", 400, worker, "PATCH", { ...profile, id: b.id });
    await request("/api/travailleur/profil", 400, worker, "PATCH", { ...profile, role: "ADMIN" });
    await request("/api/travailleur/profil", 400, worker, "PATCH", { ...profile, skills: "" });
  }
  const missionInput = { title: `${prefix}Accueil événement`, description: "Accueil du public et préparation de la salle.", category: "Événementiel", city: "Tunis", address: "10 avenue de la Liberté", date: "2030-12-15", startTime: "09:00", endTime: "17:00", pay: 90, capacity: 2, skills: "Accueil", experience: "", status: "PUBLISHED" };
  const m = await (await request("/api/missions", 201, recruiter, "POST", missionInput)).json();
  for (const worker of workers) {
    await request(`/api/missions/${m.id}`, 200, worker);
    await request(`/dashboard/travailleur/missions/${m.id}`, 200, worker);
    const list = await (await request(`/api/missions?q=${encodeURIComponent(prefix)}`, 200, worker)).json();
    assert.ok(list.some(item => item.id === m.id)); checks++;
  }
  for (const status of ["DRAFT", "CANCELLED", "COMPLETED", "FULL", "CLOSED", "IN_PROGRESS", "MODERATED"]) {
    await db.mission.update({ where: { id: m.id }, data: { status } });
    await request(`/api/missions/${m.id}`, 404, a);
    await request(`/api/missions/${m.id}/applications`, 404, a, "POST", {});
    const list = await (await request(`/api/missions?q=${encodeURIComponent(prefix)}`, 200, a)).json();
    assert.ok(!list.some(item => item.id === m.id)); checks++;
  }
  await db.mission.update({ where: { id: m.id }, data: { status: "PUBLISHED" } });
  const combined = new URLSearchParams({ q: prefix, category: "Événementiel", city: "Tunis", date: "2030-12-15", payMin: "80", payMax: "100" });
  assert.equal((await (await request(`/api/missions?${combined}`, 200, a)).json()).length, 1); checks++;
  for (const [field, value] of [["category", "Logistique"], ["city", "Sfax"], ["date", "2030-12-16"], ["payMin", "95"], ["payMax", "85"]]) {
    const params = new URLSearchParams({ q: prefix, [field]: value });
    assert.equal((await (await request(`/api/missions?${params}`, 200, a)).json()).length, 0); checks++;
  }
  for (const query of ["payMin=-1", "payMax=abc", "payMin=100&payMax=90", "date=2030-02-31", "page=0"]) await request(`/api/missions?${query}`, 400, a);
  await request(`/api/missions/${m.id}/applications`, 401, null, "POST", {});
  await request(`/api/missions/${m.id}/applications`, 403, recruiter, "POST", {});
  await request(`/api/missions/${m.id}/applications`, 400, a, "POST", { message: "x".repeat(2001) });
  await request(`/api/missions/${m.id}/applications`, 400, a, "POST", { workerId: b.id });
  await request(`/api/missions/${m.id}/applications`, 400, a, "POST", { status: "ACCEPTED" });
  const applications = [];
  for (const [i, worker] of workers.entries()) {
    const application = await (await request(`/api/missions/${m.id}/applications`, 201, worker, "POST", i ? {} : { message: "Je suis disponible pour cette mission." })).json();
    assert.equal(application.status, "PENDING"); assert.equal(application.workerId, worker.id); checks += 2;
    applications.push(application);
    await request(`/api/missions/${m.id}/applications`, 409, worker, "POST", {});
  }
  assert.equal((await (await request(`/api/missions/${m.id}/applications`, 200, recruiter)).json()).length, 3); checks++;
  const dashboard = await (await request("/recruteur/dashboard", 200, recruiter)).text();
  assert.ok(dashboard.includes(missionInput.title) && workers.every(w => dashboard.includes(w.firstName))); checks++;
  const profileView = await (await request(`/recruteur/candidatures/${applications[0].id}`, 200, recruiter)).text();
  assert.ok(profileView.includes("deux ans en restauration") && profileView.includes("Arabe, français") && profileView.includes("Je suis disponible pour cette mission.")); checks++;
  await request(`/api/applications/${applications[0].id}`, 404, b);
  await request(`/dashboard/travailleur/candidatures/${applications[0].id}`, 404, b);
  await request(`/api/applications?workerId=${a.id}`, 403, b);
  await request(`/api/applications/${applications[0].id}`, 403, a, "PATCH", { status: "ACCEPTED" });
  await request(`/api/applications/${applications[0].id}`, 200, recruiter, "PATCH", { status: "ACCEPTED" });
  assert.equal((await db.mission.findUnique({ where: { id: m.id } })).status, "PUBLISHED"); checks++;
  // Compete for the final place; either candidate may win, but exactly one must.
  const results = await Promise.all(applications.slice(1).map(application => fetch(`${base}/api/applications/${application.id}`, { method: "PATCH", headers: { Cookie: recruiter.cookie, "Content-Type": "application/json" }, body: JSON.stringify({ status: "ACCEPTED" }) })));
  assert.equal(results.filter(r => r.status === 200).length, 1); assert.ok(results.every(r => [200, 409].includes(r.status))); checks += 2;
  assert.equal(await db.application.count({ where: { missionId: m.id, status: "ACCEPTED" } }), 2); checks++;
  assert.equal((await db.mission.findUnique({ where: { id: m.id } })).status, "FULL"); checks++;
  const pending = await db.application.findFirstOrThrow({ where: { missionId: m.id, status: "PENDING" } });
  await request(`/api/applications/${pending.id}`, 409, recruiter, "PATCH", { status: "ACCEPTED" });
  await request(`/api/missions/${m.id}/applications`, 404, workers.find(w => w.id === pending.workerId), "POST", {});
  await request(`/api/applications/${pending.id}`, 200, recruiter, "PATCH", { status: "REJECTED" });
  for (const [i, worker] of workers.entries()) {
    const application = await (await request(`/api/applications/${applications[i].id}`, 200, worker)).json();
    assert.equal(application.status, worker.id === pending.workerId ? "REJECTED" : "ACCEPTED"); checks++;
    const html = await (await request(`/dashboard/travailleur/candidatures/${application.id}`, 200, worker)).text();
    assert.ok(html.includes(worker.id === pending.workerId ? "Refusée" : "Acceptée") && html.includes("Complète")); checks++;
    await request(`/api/missions/${m.id}`, 200, worker); // Own application keeps mission context available.
  }
  assert.equal((await (await request(`/api/missions?q=${encodeURIComponent(prefix)}`, 200, a)).json()).length, 0); checks++;
  // A fresh application is also refused, independently of the duplicate constraint.
  await db.application.delete({ where: { id: pending.id } });
  await request(`/api/missions/${m.id}/applications`, 404, workers.find(w => w.id === pending.workerId), "POST", {});
  assert.equal(await db.application.count({ where: { missionId: m.id } }), 2); checks++;
  // Change roles only in this isolated test account: the cookie must not grant old permissions.
  await db.user.update({ where: { id: c.id }, data: { role: "RECRUTEUR" } });
  await request(`/api/missions/${m.id}/applications`, 404, c);
  await request(`/api/applications/${applications[0].id}`, 404, c, "PATCH", { status: "REJECTED" });
  await request(`/recruteur/candidatures/${applications[0].id}`, 404, c);
  await request("/api/travailleur/profil", 403, c);
  await db.user.update({ where: { id: c.id }, data: { role: "ADMIN" } });
  await request("/dashboard/travailleur", 307, c);
  await request("/api/travailleur/profil", 403, c);
  await db.user.update({ where: { id: c.id }, data: { role: "TRAVAILLEUR" } });
  await request("/api/auth/logout", 200, a, "POST");
  await request("/api/travailleur/profil", 401, a);
  await request(`/api/missions/${m.id}/applications`, 401, a, "POST", {});
  await request("/dashboard/travailleur", 307, a);
  console.log(`${checks} contrôles travailleur réussis : 1 recruteur, 3 travailleurs, 2 places, profils, filtres, candidatures, décisions, concurrence et permissions.`);
} finally {
  const ids = users.map(user => user.id);
  await db.application.deleteMany({ where: { OR: [{ workerId: { in: ids } }, { mission: { recruiterId: { in: ids } } }] } });
  await db.mission.deleteMany({ where: { recruiterId: { in: ids } } });
  await db.user.deleteMany({ where: { id: { in: ids } } });
  await db.$disconnect();
}
