import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import env from "@next/env";
import { openWorkerBrowser } from "./worker-browser-session.mjs";
env.loadEnvConfig(process.cwd());
const db = new PrismaClient(), base = process.env.TEST_BASE_URL || "http://localhost:3100";
const prefix = `applications-${Date.now()}-`, users = [];
let checks = 0, browser;
function check(value, label) { assert.ok(value, label); checks++; }
async function call(path, code, actor, method = "GET", body) {
  const response = await fetch(base + path, { method, redirect: "manual", headers: { ...(actor ? { Cookie: actor.cookie } : {}), "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.clone().text();
  check(response.status === code || (code === 404 && response.status === 200 && text.includes("NEXT_HTTP_ERROR_FALLBACK;404")), `${method} ${path}: ${response.status}, expected ${code}: ${text.slice(0, 250)}`);
  if (response.headers.get("content-type")?.includes("application/json")) check(!/"(?:password|sessions|token)"\s*:/.test(text), "No secrets");
  return response;
}
async function account(label, role, approved = false) {
  const response = await call("/api/auth/register", 201, null, "POST", { name: "Recette", firstName: label, email: `${prefix}${label}@example.invalid`, phone: "+216 12345678", password: "test-password123", confirmPassword: "test-password123", acceptTerms: true, role, ...(role === "RECRUTEUR" ? { recruiterType: "INDIVIDUAL" } : {}) });
  const actor = { ...await response.json(), cookie: response.headers.get("set-cookie").split(";")[0] }; users.push(actor);
  if (approved) await db.recruiterVerification.update({ where: { userId: actor.id }, data: { status: "APPROUVE" } });
  return actor;
}
const missionBody = { title: `${prefix}Accueil`, description: "Accueil des visiteurs pendant une journée.", category: "Services", city: "Tunis", address: "10 rue des Fleurs", date: "2035-12-15", startTime: "09:00", endTime: "17:00", pay: 90, capacity: 1, skills: "Accueil", status: "PUBLISHED" };
async function concurrent(path, actors, bodies) {
  return Promise.all(actors.map((actor, i) => fetch(base + path, { method: "PATCH", headers: { Cookie: actor.cookie, "Content-Type": "application/json" }, body: JSON.stringify(bodies[i]) })));
}
try {
  const r = await account("recruiter", "RECRUTEUR", true), other = await account("other", "RECRUTEUR", true), pending = await account("pending", "RECRUTEUR");
  const workers = await Promise.all(["Amira", "Sami", "Lina", "Nour"].map(name => account(name, "TRAVAILLEUR")));
  const [a, b, c, d] = workers;
  const m = await (await call("/api/missions", 201, r, "POST", missionBody)).json();
  const post = `/api/missions/${m.id}/applications`;
  await call(post, 401, null, "POST", {});
  await call(post, 403, r, "POST", {});
  await call(post, 400, a, "POST", { message: "x".repeat(2001) });
  await call(post, 400, a, "POST", { workerId: b.id });
  await call(post, 400, a, "POST", { status: "ACCEPTED" });
  const duplicateRace = await Promise.all([1, 2].map(() => fetch(base + post, { method: "POST", headers: { Cookie: a.cookie, "Content-Type": "application/json" }, body: JSON.stringify({ message: "Disponible pour votre mission" }) })));
  check(duplicateRace.filter(x => x.status === 201).length === 1 && duplicateRace.filter(x => x.status === 409).length === 1, "Concurrent duplicate blocked");
  const first = await db.application.findUniqueOrThrow({ where: { missionId_workerId: { missionId: m.id, workerId: a.id } } });
  check(first.status === "PENDING" && first.message === "Disponible pour votre mission", "Initial status and message persist");
  const second = await (await call(post, 201, b, "POST", {})).json();
  const third = await (await call(post, 201, c, "POST", {})).json();
  const list = await (await call(post, 200, r)).json();
  check(list.length === 3 && list.every(x => x.missionId === m.id), "Owner sees candidates");
  await call(post, 404, other);
  await call(post, 403, pending);
  await call(`/api/applications/${first.id}`, 404, b);
  await call(`/api/applications/${first.id}`, 404, other);
  await call(`/api/applications/${first.id}`, 401, null, "PATCH", { status: "ACCEPTED" });
  await call(`/api/applications/${first.id}`, 403, a, "PATCH", { status: "ACCEPTED" });
  await call(`/api/applications/${first.id}`, 403, pending, "PATCH", { status: "ACCEPTED" });
  await call(`/api/applications/${first.id}`, 404, other, "PATCH", { status: "ACCEPTED" });
  await call(`/api/applications/${first.id}`, 400, r, "PATCH", { status: "ACCEPTED", workerId: b.id });
  await db.user.update({ where: { id: r.id }, data: { suspended: true } });
  await call(`/api/applications/${first.id}`, 401, r, "PATCH", { status: "ACCEPTED" });
  await db.user.update({ where: { id: r.id }, data: { suspended: false } });
  const acceptRace = await Promise.all([first, second].map(x => fetch(`${base}/api/applications/${x.id}`, { method: "PATCH", headers: { Cookie: r.cookie, "Content-Type": "application/json" }, body: JSON.stringify({ status: "ACCEPTED" }) })));
  check(acceptRace.filter(x => x.status === 200).length === 1 && acceptRace.filter(x => x.status === 409).length === 1, "Exactly one final place allocated");
  check(await db.application.count({ where: { missionId: m.id, status: "ACCEPTED" } }) === 1, "No overbooking");
  check((await db.mission.findUniqueOrThrow({ where: { id: m.id } })).status === "FULL", "Mission becomes complete");
  await call(post, 404, d, "POST", {});
  const accepted = await db.application.findFirstOrThrow({ where: { missionId: m.id, status: "ACCEPTED" } });
  const winner = workers.find(w => w.id === accepted.workerId);
  const remaining = accepted.id === first.id ? second : first;
  const rejectedRace = await concurrent(`/api/applications/${third.id}`, [r, r], [{ status: "REJECTED" }, { status: "REJECTED" }]);
  check(rejectedRace.filter(x => x.status === 200).length === 1 && rejectedRace.filter(x => x.status === 409).length === 1, "Double decision blocked");
  check(await db.notification.count({ where: { userId: c.id } }) === 1, "Exactly one rejection notification");
  check((await (await call("/api/notifications", 200, c)).json())[0].message.includes("refusée"), "Worker notified of refusal");
  check((await (await call("/api/notifications", 200, winner)).json())[0].message.includes("acceptée"), "Worker notified of acceptance");
  await call(`/api/applications/${accepted.id}`, 409, r, "PATCH", { status: "REJECTED" });
  await call(`/api/applications/${accepted.id}`, 404, d, "PATCH", { status: "CANCELLED" });
  await call(`/api/applications/${accepted.id}`, 403, r, "PATCH", { status: "CANCELLED" });
  await call(`/api/applications/${accepted.id}`, 200, winner, "PATCH", { status: "CANCELLED" });
  check((await db.mission.findUniqueOrThrow({ where: { id: m.id } })).status === "PUBLISHED", "Withdrawal frees place and reopens full mission");
  await call(`/api/applications/${accepted.id}`, 409, winner, "PATCH", { status: "CANCELLED" });
  await call(post, 409, winner, "POST", {});
  await call(`/api/applications/${remaining.id}`, 200, r, "PATCH", { status: "ACCEPTED" });
  check((await db.mission.findUniqueOrThrow({ where: { id: m.id } })).status === "FULL", "Freed place can be allocated once");
  await call(`/api/missions/${m.id}`, 200, r, "PATCH", { status: "CLOSED" });
  const remainingWorker = workers.find(w => w.id === remaining.workerId);
  await call(`/api/applications/${remaining.id}`, 200, remainingWorker, "PATCH", { status: "CANCELLED" });
  check((await db.mission.findUniqueOrThrow({ where: { id: m.id } })).status === "CLOSED", "Withdrawal does not reopen closed mission");
  check(await db.application.count({ where: { missionId: m.id } }) === 3, "History preserved");
  for (const x of [accepted, remaining, third]) {
    const actor = workers.find(w => w.id === x.workerId);
    const result = await (await call(`/api/applications/${x.id}`, 200, actor)).json();
    check(result.status === (x.id === third.id ? "REJECTED" : "CANCELLED"), "Status coherent after reload");
  }
  // Race acceptance with withdrawal of the same pending application.
  const raceMission = await (await call("/api/missions", 201, r, "POST", { ...missionBody, title: `${prefix}Race` })).json();
  const raceApp = await (await call(`/api/missions/${raceMission.id}/applications`, 201, a, "POST", {})).json();
  const race = await concurrent(`/api/applications/${raceApp.id}`, [r, a], [{ status: "ACCEPTED" }, { status: "CANCELLED" }]);
  check(race.every(x => [200, 409].includes(x.status)), "Race produces controlled responses");
  const afterRace = await db.application.findUniqueOrThrow({ where: { id: raceApp.id } });
  check(afterRace.status === "CANCELLED" && (await db.mission.findUniqueOrThrow({ where: { id: raceMission.id } })).status === "PUBLISHED", "Concurrent withdrawal leaves no ghost reservation");
  if (process.env.TEST_BROWSER !== "0") {
    const bm = await (await call("/api/missions", 201, r, "POST", { ...missionBody, title: `${prefix}Navigateur` })).json();
    await db.user.update({ where: { id: d.id }, data: { skills: "Service et accueil", experience: "Deux ans en restauration", languages: "Français et arabe", bio: "Disponible pour vos événements" } });
    browser = await openWorkerBrowser(base);
    await browser.cookie(d.cookie);
    await browser.go(`/dashboard/travailleur/missions/${bm.id}`);
    await browser.evaluate("document.querySelector('.wk-apply-form textarea').value='Motivation navigateur'; document.querySelector('.wk-apply-form button').click()");
    await browser.until("location.pathname.includes('/candidatures/') && document.body.textContent.includes('En attente')");
    const ba = await db.application.findUniqueOrThrow({ where: { missionId_workerId: { missionId: bm.id, workerId: d.id } } });
    check(ba.status === "PENDING" && ba.message === "Motivation navigateur", "Browser application persists");
    await browser.cookie(r.cookie);
    await browser.go(`/recruteur/candidatures?mission=${bm.id}`);
    check(await browser.evaluate("document.body.textContent.includes('Nour') && document.body.textContent.includes('En attente')"), "Recruiter sees pending candidate");
    await browser.go(`/recruteur/candidatures/${ba.id}`);
    for (const text of ["Service et accueil", "Deux ans en restauration", "Français et arabe", "Motivation navigateur"]) check(await browser.evaluate(`document.body.textContent.includes(${JSON.stringify(text)})`), "Candidate qualifications visible");
    await browser.evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Accepter la candidature').click()");
    await browser.until("!!document.querySelector('[role=dialog]')");
    await browser.evaluate("[...document.querySelectorAll('[role=dialog] button')].find(b=>b.textContent==='Confirmer').click()");
    await browser.until("!document.querySelector('[role=dialog]') && document.body.textContent.includes('Acceptée')");
    check((await db.mission.findUniqueOrThrow({ where: { id: bm.id } })).status === "FULL", "Browser acceptance fills mission");
    await browser.go("/recruteur/dashboard");
    check(await browser.evaluate(`[...document.querySelectorAll('.rq-upcoming')].find(a => a.getAttribute('href') === '/recruteur/missions/${bm.id}')?.textContent.includes('1 travailleur sélectionné')`), "Existing agenda reflects acceptance");
    await browser.cookie(d.cookie);
    await browser.go("/dashboard/travailleur/candidatures");
    check(await browser.evaluate("document.body.textContent.includes('a été acceptée')"), "Notification visible to worker");
    await browser.go(`/dashboard/travailleur/candidatures/${ba.id}`);
    check(await browser.evaluate("document.body.textContent.includes('Acceptée') && document.body.textContent.includes('Complète')"), "Worker reload reflects acceptance and capacity");
    await browser.evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Retirer ma candidature').click()");
    await browser.until("!!document.querySelector('[role=dialog]')");
    await browser.evaluate("[...document.querySelectorAll('[role=dialog] button')].find(b=>b.textContent==='Confirmer').click()");
    await browser.until("!document.querySelector('[role=dialog]') && document.body.textContent.includes('Retirée')");
    check((await db.mission.findUniqueOrThrow({ where: { id: bm.id } })).status === "PUBLISHED", "Browser withdrawal frees capacity");
    await browser.cookie(r.cookie);
    await browser.go("/recruteur/dashboard");
    check(await browser.evaluate(`[...document.querySelectorAll('.rq-upcoming')].find(a => a.getAttribute('href') === '/recruteur/missions/${bm.id}')?.textContent.includes('0 travailleur sélectionné')`), "Existing agenda reflects withdrawal");
    check(browser.errors.length === 0, "No browser exceptions");
  }
  console.log(`${checks} contrôles candidatures réussis : API, Prisma, concurrence${browser ? ', navigateur' : ''}.`);
} finally {
  if (browser) await browser.close();
  const ids = users.map(u => u.id);
  await db.application.deleteMany({ where: { OR: [{ workerId: { in: ids } }, { mission: { recruiterId: { in: ids } } }] } });
  await db.mission.deleteMany({ where: { recruiterId: { in: ids } } });
  await db.user.deleteMany({ where: { id: { in: ids } } });
  await db.$disconnect();
}
