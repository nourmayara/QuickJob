import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import nextEnv from "@next/env";
import { openWorkerBrowser } from "./worker-browser-session.mjs";
nextEnv.loadEnvConfig(process.cwd());
const db = new PrismaClient(), base = process.env.TEST_BASE_URL || "http://localhost:3100";
const prefix = `browser-worker-${Date.now()}-`, users = [];
let browser;
async function api(route, expected, actor, method = "GET", body) {
  const response = await fetch(base + route, { method, headers: { ...(actor ? { Cookie: actor.cookie } : {}), ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  assert.equal(response.status, expected, `${method} ${route}: ${await response.clone().text()}`); return response;
}
async function account(name, role) {
  const response = await api("/api/auth/register", 201, null, "POST", { name: "Recette", firstName: name, phone: "+216 12345678", email: `${prefix}${name}@example.invalid`, password: "test-password123", confirmPassword: "test-password123", acceptTerms: true, role, ...(role === "RECRUTEUR" ? { recruiterType: "INDIVIDUAL" } : {}) });
  const actor = { ...await response.json(), cookie: response.headers.get("set-cookie").split(";")[0] }; users.push(actor); return actor;
}
try {
  const recruiter = await account("Recruteur", "RECRUTEUR");
  const a = await account("Amira", "TRAVAILLEUR"), b = await account("Sami", "TRAVAILLEUR"), c = await account("Lina", "TRAVAILLEUR");
  const m = await (await api("/api/missions", 201, recruiter, "POST", { title: `${prefix}Accueil restaurant`, description: "Accueillir les clients et préparer les tables pour le service.", category: "Restauration", city: "Tunis", address: "10 avenue de la Liberté", date: "2030-12-15", startTime: "09:00", endTime: "17:00", pay: 90, capacity: 2, skills: "Accueil", experience: "", status: "PUBLISHED" })).json();
  browser = await openWorkerBrowser(base);
  await browser.cdp("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await browser.cookie(a.cookie); await browser.go("/dashboard/travailleur/profil");
  const profile = { city: "Tunis", skills: "Service, accueil", experience: "Deux ans en restauration", languages: "Arabe, français", bio: "Disponible pour vos événements." };
  await browser.evaluate(`(() => { for (const [name,value] of Object.entries(${JSON.stringify(profile)})) document.querySelector('form [name='+name+']').value=value; document.querySelector('form .rq-form-actions button').click(); })()`);
  await browser.until("!!document.querySelector('.rq-success')");
  assert.equal((await db.user.findUnique({ where: { id: a.id } })).experience, profile.experience);
  for (const worker of [b, c]) await api("/api/travailleur/profil", 200, worker, "PATCH", profile);
  await browser.go("/dashboard/travailleur/missions");
  await browser.evaluate(`(() => { const values={q:${JSON.stringify(prefix)},city:'Tunis',category:'Restauration',date:'2030-12-15',payMin:'80',payMax:'100'}; for(const [name,value] of Object.entries(values)) document.querySelector('form [name='+name+']').value=value; document.querySelector('form button').click(); })()`);
  await browser.until(`new URLSearchParams(location.search).get('q') === ${JSON.stringify(prefix)} && document.querySelectorAll('.wk-mission-card').length === 1`);
  for (const [width, height, name] of [[1440, 1000, "desktop"], [900, 1000, "tablet"], [390, 844, "mobile"]]) {
    await browser.cdp("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 760 });
    if (width < 760) await browser.until("document.querySelector('.rq-sidebar').getBoundingClientRect().right <= 1");
    assert.ok(await browser.evaluate("document.documentElement.scrollWidth <= innerWidth"), `${name}: horizontal overflow`);
    await browser.screenshot(`worker-missions-${name}.png`);
  }
  await browser.evaluate(`document.querySelector('a[href="/dashboard/travailleur/missions/${m.id}"]').click()`);
  await browser.until(`location.pathname === '/dashboard/travailleur/missions/${m.id}' && !!document.querySelector('.wk-apply-form')`);
  assert.equal(await browser.evaluate("document.querySelectorAll('.wk-apply-form').length"), 1);
  const message = "Je souhaite rejoindre votre équipe pour cette mission.";
  await browser.evaluate(`document.querySelector('.wk-apply-form textarea').value=${JSON.stringify(message)}; document.querySelector('.wk-apply-form button').click()`);
  await browser.until("!!document.querySelector('.rq-status-pending') && location.pathname.includes('/candidatures/')");
  const appA = await db.application.findUniqueOrThrow({ where: { missionId_workerId: { missionId: m.id, workerId: a.id } } });
  assert.equal(appA.message, message);
  const appB = await (await api(`/api/missions/${m.id}/applications`, 201, b, "POST", {})).json();
  const appC = await (await api(`/api/missions/${m.id}/applications`, 201, c, "POST", {})).json();
  await browser.cdp("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await browser.cookie(recruiter.cookie); await browser.go(`/recruteur/candidatures/${appA.id}`);
  assert.ok(await browser.evaluate(`document.body.textContent.includes(${JSON.stringify(message)}) && document.body.textContent.includes(${JSON.stringify(profile.experience)}) && document.body.textContent.includes(${JSON.stringify(profile.languages)})`));
  await browser.evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent === 'Accepter la candidature').click()");
  await browser.until("!!document.querySelector('[role=dialog]')");
  await browser.evaluate("[...document.querySelectorAll('[role=dialog] button')].find(b=>b.textContent === 'Confirmer').click()");
  await browser.until("!!document.querySelector('.rq-status-accepted')");
  await api(`/api/applications/${appB.id}`, 200, recruiter, "PATCH", { status: "ACCEPTED" });
  await api(`/api/applications/${appC.id}`, 409, recruiter, "PATCH", { status: "ACCEPTED" });
  await browser.cookie(c.cookie); await browser.go(`/dashboard/travailleur/candidatures/${appC.id}`);
  assert.ok(await browser.evaluate("!!document.querySelector('.rq-status-pending') && !!document.querySelector('.rq-status-full')"));
  await api(`/api/applications/${appC.id}`, 200, recruiter, "PATCH", { status: "REJECTED" });
  await browser.evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Actualiser les statuts')).click()");
  await browser.until("!!document.querySelector('.rq-status-rejected')");
  await browser.cookie(a.cookie); await browser.go(`/dashboard/travailleur/candidatures/${appA.id}`);
  assert.ok(await browser.evaluate("!!document.querySelector('.rq-status-accepted') && !!document.querySelector('.rq-status-full')"));
  await api(`/api/missions/${m.id}/applications`, 404, c, "POST", {});
  assert.equal(await db.application.count({ where: { missionId: m.id, status: "ACCEPTED" } }), 2);
  assert.deepEqual(browser.errors, []);
  console.log("Recette Chrome réussie : profil, recherche et filtres, responsive, candidature avec message, profil recruteur, confirmation d’acceptation, 2 places, refus du troisième et actualisation du statut travailleur.");
} finally {
  await browser?.close();
  const ids = users.map(user => user.id);
  await db.application.deleteMany({ where: { OR: [{ workerId: { in: ids } }, { mission: { recruiterId: { in: ids } } }] } });
  await db.mission.deleteMany({ where: { recruiterId: { in: ids } } });
  await db.user.deleteMany({ where: { id: { in: ids } } });
  await db.$disconnect();
}
