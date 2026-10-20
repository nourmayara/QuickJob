import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const db = new PrismaClient();
const base = process.env.TEST_BASE_URL || "http://localhost:3100";
const prefix = `recruiter-${Date.now()}-`;
const users = [];
let checks = 0;
async function request(path, code, cookie = "", method = "GET", body) {
  const r = await fetch(base + path, { method, redirect: "manual", headers: { ...(cookie ? { Cookie: cookie } : {}), ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const text = await r.clone().text();
  // Next may already have streamed the loading boundary when notFound() resolves.
  const streamedNotFound = code === 404 && r.status === 200 && r.headers.get("content-type")?.includes("text/html") && text.includes("NEXT_HTTP_ERROR_FALLBACK;404");
  assert.ok(r.status === code || streamedNotFound, `${method} ${path}: expected ${code}, got ${r.status}: ${text.slice(0, 500)}`);
  if (streamedNotFound) assert.ok(!text.includes("Équipe événementiel"), "A foreign mission must not leak into the streamed not-found response");
  checks++; return r;
}
async function account(suffix, role) {
  const body = { name: "Test", firstName: "Sarah", phone: "+216 12345678", email: `${prefix}${suffix}@example.invalid`, password: "test-password123", confirmPassword: "test-password123", acceptTerms: true, role, ...(role === "RECRUTEUR" ? { recruiterType: "INDIVIDUAL" } : {}) };
  const r = await request("/api/auth/register", 201, "", "POST", body);
  const user = { ...await r.json(), cookie: r.headers.get("set-cookie").split(";")[0] };
  users.push(user); return user;
}
const missionBody = { title: "Équipe événementiel", description: "Accueil des visiteurs et préparation de la salle.", category: "Événementiel", city: "Tunis", address: "10 avenue de la Liberté", date: "2030-12-15", startTime: "09:00", endTime: "17:00", pay: 80, capacity: 1, skills: "Accueil", experience: "", status: "PUBLISHED" };
try {
  const a = await account("a", "RECRUTEUR"), b = await account("b", "RECRUTEUR"), w = await account("worker", "TRAVAILLEUR"), w2 = await account("worker2", "TRAVAILLEUR"), admin = await account("admin", "TRAVAILLEUR");
  await db.user.update({ where: { id: admin.id }, data: { role: "ADMIN" } });
  await request("/recruteur/dashboard", 200, a.cookie);
  const unauthenticated = await request("/recruteur/dashboard", 307);
  assert.ok(unauthenticated.headers.get("location").endsWith("/login")); checks++;
  for (const [actor, destination] of [[w, "/dashboard/travailleur"], [admin, "/dashboard/administrateur"]]) {
    const r = await request("/recruteur/dashboard", 307, actor.cookie);
    assert.ok(r.headers.get("location").endsWith(destination)); checks++;
    await request("/api/recruteur/profil", 403, actor.cookie, "PATCH", {});
  }
  for (const path of ["missions", "missions/nouvelle", "candidatures", "travailleurs", "messages", "profil", "parametres"]) {
    await request(`/recruteur/${path}`, 200, a.cookie);
    await request(`/recruteur/${path}`, 307, w.cookie);
    await request(`/recruteur/${path}`, 307);
  }
  const old = await request("/dashboard/recruteur", 307, a.cookie);
  assert.ok(old.headers.get("location").endsWith("/recruteur/dashboard")); checks++;
  const m = await (await request("/api/missions", 201, a.cookie, "POST", missionBody)).json();
  await request(`/recruteur/missions/${m.id}`, 200, a.cookie);
  await request(`/recruteur/missions/${m.id}/modifier`, 200, a.cookie);
  for (const path of [`/api/missions/${m.id}`, `/recruteur/missions/${m.id}`, `/recruteur/missions/${m.id}/modifier`, `/recruteur/candidatures?mission=${m.id}`]) await request(path, 404, b.cookie);
  await request(`/api/missions/${m.id}`, 404, b.cookie, "PATCH", { title: "Interdit" });
  await request(`/api/missions/${m.id}`, 400, a.cookie, "PATCH", { recruiterId: b.id });
  await request("/api/missions", 400, a.cookie, "POST", { ...missionBody, capacity: 0 });
  await request("/api/missions", 400, a.cookie, "POST", { ...missionBody, endTime: "08:00" });
  const c1 = await (await request(`/api/missions/${m.id}/applications`, 201, w.cookie, "POST", {})).json();
  const c2 = await (await request(`/api/missions/${m.id}/applications`, 201, w2.cookie, "POST", {})).json();
  await request(`/api/applications/${c1.id}`, 404, b.cookie, "PATCH", { status: "ACCEPTED" });
  await request(`/recruteur/candidatures/${c1.id}`, 404, b.cookie);
  await request(`/recruteur/candidatures/${c1.id}`, 200, a.cookie);
  // Concurrent acceptance requests must never allocate the last place twice.
  const race = await Promise.all([c1, c2].map(c => fetch(`${base}/api/applications/${c.id}`, { method: "PATCH", headers: { Cookie: a.cookie, "Content-Type": "application/json" }, body: JSON.stringify({ status: "ACCEPTED" }) })));
  assert.equal(race.filter(r => r.status === 200).length, 1); checks++;
  assert.ok(race.every(r => [200, 409].includes(r.status))); checks++;
  assert.equal(await db.application.count({ where: { missionId: m.id, status: "ACCEPTED" } }), 1); checks++;
  assert.equal((await db.mission.findUnique({ where: { id: m.id } })).status, "FULL"); checks++;
  const pending = await db.application.findFirst({ where: { missionId: m.id, status: "PENDING" } });
  await request(`/api/applications/${pending.id}`, 409, a.cookie, "PATCH", { status: "ACCEPTED" });
  await request(`/api/applications/${pending.id}`, 200, a.cookie, "PATCH", { status: "REJECTED" });
  await request(`/api/applications/${pending.id}`, 409, a.cookie, "PATCH", { status: "REJECTED" });
  await request(`/api/missions/${m.id}`, 400, a.cookie, "PATCH", { capacity: 0 });
  await request(`/api/missions/${m.id}`, 200, a.cookie, "PATCH", { capacity: 2 });
  assert.equal((await db.mission.findUnique({ where: { id: m.id } })).status, "PUBLISHED"); checks++;
  await request(`/api/missions/${m.id}`, 200, a.cookie, "PATCH", { status: "CLOSED" });
  await request(`/api/missions/${m.id}`, 200, a.cookie, "PATCH", { status: "IN_PROGRESS" });
  await request(`/api/missions/${m.id}`, 200, a.cookie, "PATCH", { status: "COMPLETED" });
  await request(`/api/missions/${m.id}`, 404, a.cookie, "PATCH", { title: "Modification tardive" });
  const profile = { name: "Test", firstName: "Sarah", companyName: "QuickJob Test", sector: "Services", bio: "Présentation", city: "Tunis", phone: "+216 12345678", avatarUrl: "" };
  await request("/api/recruteur/profil", 200, a.cookie, "PATCH", profile);
  await request("/api/recruteur/profil", 400, a.cookie, "PATCH", { ...profile, role: "ADMIN" });
  const dashboard = await (await request("/recruteur/dashboard", 200, a.cookie)).text();
  assert.ok(dashboard.includes("Équipe événementiel")); checks++;
  assert.ok(!dashboard.includes('"password":')); checks++;
  await request("/api/auth/logout", 200, a.cookie, "POST");
  await request("/recruteur/dashboard", 307, a.cookie);
  await request("/api/missions", 401, a.cookie);
  await request("/api/recruteur/profil", 401, a.cookie, "PATCH", profile);
  console.log(`${checks} contrôles recruteur réussis, dont accès, isolation, navigation, validation, concurrence et déconnexion.`);
} finally {
  const ids = users.map(u => u.id);
  await db.application.deleteMany({ where: { OR: [{ workerId: { in: ids } }, { mission: { recruiterId: { in: ids } } }] } });
  await db.mission.deleteMany({ where: { recruiterId: { in: ids } } });
  await db.user.deleteMany({ where: { id: { in: ids } } });
  await db.$disconnect();
}
