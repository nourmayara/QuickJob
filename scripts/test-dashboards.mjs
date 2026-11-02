import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import env from "@next/env";
import { openWorkerBrowser } from "./worker-browser-session.mjs";
env.loadEnvConfig(process.cwd());
const db = new PrismaClient(), base = process.env.TEST_BASE_URL || "http://localhost:3100", prefix = `dashboards-${Date.now()}-`, users = [];
let checks = 0, browser;
const check = (v, label) => { assert.ok(v, label); checks++; };
async function call(path, code, actor, method = "GET", body) {
  const response = await fetch(base + path, { method, redirect: "manual", headers: { ...(actor ? { Cookie: actor.cookie } : {}), "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.clone().text();
  const streamedRedirect = code === 307 && response.status === 200 && (text.includes("NEXT_REDIRECT") || text.includes("__next-page-redirect"));
  check(response.status === code || streamedRedirect, `${method} ${path}: ${response.status}, expected ${code}: ${text.slice(0, 250)}`);
  if (streamedRedirect) check(!text.includes('data-kpi="'), "Unauthorized streamed response contains no dashboard metrics");
  check(!/"(?:password|sessions|token)"\s*:/.test(text), "No sensitive fields");
  return response;
}
async function account(label, role, approved = true) {
  const response = await call("/api/auth/register", 201, null, "POST", { name: "Recette", firstName: label, email: `${prefix}${label}@example.invalid`, phone: "+216 12345678", password: "test-password123", confirmPassword: "test-password123", acceptTerms: true, role, ...(role === "RECRUTEUR" ? { recruiterType: "INDIVIDUAL" } : {}) });
  const actor = { ...await response.json(), cookie: response.headers.get("set-cookie").split(";")[0] }; users.push(actor);
  if (role === "RECRUTEUR" && approved) await db.recruiterVerification.update({ where: { userId: actor.id }, data: { status: "APPROUVE" } });
  return actor;
}
function kpi(html, key, expected) {
  const match = new RegExp(`<strong[^>]*data-kpi="${key}"[^>]*data-value="([^"]*)"`).exec(html);
  check(!!match, `KPI ${key} exists`);
  check(expected === null ? match[1] === "" : Number(match[1]) === expected, `${key}: ${match[1]}, expected ${expected}`);
}
async function html(path, actor) { return (await call(path, 200, actor)).text(); }
const active = ["PUBLISHED", "FULL", "CLOSED", "IN_PROGRESS"];
const mission = { title: `${prefix}Publication`, description: "Accueil du public pendant une journée.", category: "Services", city: "Tunis", address: "10 rue des Fleurs", date: "2038-12-15", startTime: "09:00", endTime: "12:00", pay: 90, capacity: 3, skills: "Accueil", status: "PUBLISHED" };
async function adminCheck(admin) {
  const stats = await (await call("/api/admin/statistics", 200, admin)).json();
  check(stats.users === await db.user.count(), "Admin user total matches DB");
  check(stats.missions === await db.mission.count(), "Admin mission total matches DB");
  check(stats.applications === await db.application.count(), "Admin application total matches DB");
  check(stats.suspended === await db.user.count({ where: { suspended: true } }), "Suspensions match DB");
  for (const group of stats.usersByRole) check(group.count === await db.user.count({ where: { role: group.role } }), "Role grouping matches DB");
  for (const group of stats.missionsByStatus) check(group.count === await db.mission.count({ where: { status: group.status } }), "Mission status grouping matches DB");
  for (const group of stats.applicationsByStatus) check(group.count === await db.application.count({ where: { status: group.status } }), "Application status grouping matches DB");
  check(stats.charts.categories.reduce((n, g) => n + g.value, 0) === stats.missions, "Category chart covers every mission including others");
  check(stats.charts.locations.reduce((n, g) => n + g.value, 0) === stats.missions, "City chart covers every mission including others");
  check(stats.charts.outcomes[0].value === await db.mission.count({ where: { status: "COMPLETED" } }), "Completed chart excludes FULL");
  check(stats.charts.outcomes[1].value === await db.mission.count({ where: { status: "CANCELLED" } }), "Cancelled chart matches DB");
  for (let i = 0; i < stats.charts.registrations.length; i++) {
    const group = stats.charts.registrations[i], next = stats.charts.registrations[i + 1];
    const start = new Date(`${group.key}-01T00:00:00+01:00`), end = next ? new Date(`${next.key}-01T00:00:00+01:00`) : new Date(Date.now() + 1000);
    check(group.value === await db.user.count({ where: { createdAt: { gte: start, lt: end } } }), "Registration chart matches Tunis month bounds");
  }
  check(stats.reports.available === true && stats.reports.total === await db.report.count(), "Reporting count matches the real source");
  const page = await html("/dashboard/administrateur", admin);
  kpi(page, "users", stats.users); kpi(page, "missions", stats.missions); kpi(page, "applications", stats.applications); kpi(page, "reports", stats.reports.total);
  for (const role of ["TRAVAILLEUR", "RECRUTEUR", "ADMIN"]) kpi(page, `role-${role}`, await db.user.count({ where: { role } }));
  return stats;
}
async function recruiterCheck(actor) {
  const rows = await db.mission.findMany({ where: { recruiterId: actor.id }, include: { applications: true } });
  const page = await html("/recruteur/dashboard", actor);
  kpi(page, "active", rows.filter(m => active.includes(m.status)).length);
  kpi(page, "completed", rows.filter(m => m.status === "COMPLETED").length);
  kpi(page, "applications", rows.reduce((n, m) => n + m.applications.length, 0));
  kpi(page, "selected", new Set(rows.filter(m => active.includes(m.status)).flatMap(m => m.applications.filter(a => a.status === "ACCEPTED").map(a => a.workerId))).size);
  return page;
}
async function workerCheck(actor, upcoming) {
  const rows = await db.application.findMany({ where: { workerId: actor.id }, include: { mission: true } });
  const reviews = await db.review.findMany({ where: { recipientId: actor.id } });
  const completed = rows.filter(a => a.status === "ACCEPTED" && a.mission.status === "COMPLETED");
  const page = await html("/dashboard/travailleur", actor);
  kpi(page, "completed", completed.length);
  kpi(page, "pending", rows.filter(a => a.status === "PENDING" && ["PUBLISHED", "FULL", "CLOSED"].includes(a.mission.status)).length);
  kpi(page, "rating", reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null);
  kpi(page, "declaredPay", completed.length && completed.every(a => a.mission.pay === null) ? null : completed.reduce((sum, a) => sum + (a.mission.pay || 0), 0));
  kpi(page, "upcoming", upcoming);
  check(page.includes('/dashboard/travailleur/calendrier') && page.includes('/dashboard/travailleur/missions'), "Worker quick calendar and search links");
  return page;
}
try {
  const r = await account("Recruiter", "RECRUTEUR"), emptyRecruiter = await account("EmptyRecruiter", "RECRUTEUR"), pending = await account("PendingRecruiter", "RECRUTEUR", false);
  const a = await account("Amira", "TRAVAILLEUR"), empty = await account("EmptyWorker", "TRAVAILLEUR"), c = await account("CancelledWorker", "TRAVAILLEUR"), admin = await account("Admin", "TRAVAILLEUR");
  await db.user.update({ where: { id: admin.id }, data: { role: "ADMIN" } });
  for (const [actor, code] of [[null, 401], [a, 403], [r, 403]]) await call("/api/admin/statistics", code, actor);
  for (const [path, actor] of [["/dashboard/administrateur", a], ["/dashboard/administrateur", r], ["/recruteur/dashboard", a], ["/dashboard/travailleur", r], ["/recruteur/dashboard", pending], ["/dashboard/travailleur", null]]) await call(path, 307, actor);
  const emptyPage = await workerCheck(empty, 0); check(emptyPage.includes("Aucun avis") && emptyPage.includes("Aucune mission confirmée à venir"), "Empty worker states");
  const emptyR = await recruiterCheck(emptyRecruiter); check(emptyR.includes("Aucune mission à venir"), "Empty recruiter agenda");
  await db.user.update({ where: { id: a.id }, data: { city: "Tunis" } });
  const published = await (await call("/api/missions", 201, r, "POST", mission)).json();
  async function fixture(label, status, date, pay, applicationStatus, worker = a) {
    const m = await db.mission.create({ data: { ...mission, date: date ? new Date(`${date}T00:00:00Z`) : null, recruiterId: r.id, title: `${prefix}${label}`, status, pay } });
    if (applicationStatus) await db.application.create({ data: { workerId: worker.id, missionId: m.id, status: applicationStatus } });
    return m;
  }
  const completed = await fixture("Terminée", "COMPLETED", "2020-01-10", 140.25, "ACCEPTED");
  const unknownPay = await fixture("Montant inconnu", "COMPLETED", "2020-01-11", null, "ACCEPTED");
  const upcoming = await fixture("Confirmée", "FULL", "2038-12-16", 50, "ACCEPTED");
  await fixture("Confirmée adjacente", "CLOSED", "2038-12-17", 60, "ACCEPTED");
  await fixture("Ancienne active", "IN_PROGRESS", "2020-01-12", 70, "ACCEPTED");
  await fixture("Annulée en attente", "CANCELLED", "2038-12-18", 900, "PENDING");
  await fixture("Annulée sélectionnée", "CANCELLED", "2038-12-18", 900, "ACCEPTED", c);
  await fixture("Masquée", "MODERATED", "2038-12-19", 80, "PENDING");
  await db.review.createMany({ data: [{ missionId: completed.id, authorId: r.id, recipientId: a.id, rating: 4, comment: "Très bien" }, { missionId: unknownPay.id, authorId: r.id, recipientId: a.id, rating: 2, comment: "À améliorer" }] });
  // A bounded set of historical fixtures exercises the top-ten + Other aggregates.
  for (let i = 0; i < 12; i++) await db.mission.create({ data: { title: `${prefix}Répartition ${i}`, description: "Fixture de statistiques", recruiterId: r.id, status: "DRAFT", category: i === 0 ? null : `${prefix}cat-${i}`, city: i === 0 ? null : `${prefix}ville-${i}` } });
  let workerPage = await workerCheck(a, 2);
  check(workerPage.includes("140,25") && workerPage.includes("1 montant(s) non renseigné(s)"), "Declared remuneration excludes cancellations and explains unknown amounts");
  check(workerPage.includes("Missions près de Tunis"), "Simple city-based recommendations");
  await recruiterCheck(r); await adminCheck(admin);
  const app = await (await call(`/api/missions/${published.id}/applications`, 201, a, "POST", {})).json();
  workerPage = await workerCheck(a, 2); kpi(workerPage, "pending", 1);
  await recruiterCheck(r);
  await call(`/api/applications/${app.id}`, 200, r, "PATCH", { status: "ACCEPTED" });
  await workerCheck(a, 3); const recruitedPage = await recruiterCheck(r); kpi(recruitedPage, "selected", 1);
  // Simulate the passage of time for this test fixture before completing it.
  await db.mission.update({ where: { id: published.id }, data: { date: new Date("2020-01-13T00:00:00Z") } });
  await call(`/api/missions/${published.id}`, 200, r, "PATCH", { status: "CLOSED" });
  await call(`/api/missions/${published.id}`, 200, r, "PATCH", { status: "COMPLETED" });
  const finishedPage = await workerCheck(a, 2); kpi(finishedPage, "completed", 3); kpi(finishedPage, "declaredPay", 230.25);
  await call(`/api/missions/${upcoming.id}`, 200, r, "PATCH", { status: "CANCELLED" });
  await workerCheck(a, 1); await recruiterCheck(r); await adminCheck(admin);
  if (process.env.TEST_BROWSER !== "0") {
    browser = await openWorkerBrowser(base); await browser.cookie(a.cookie);
    await browser.go("/dashboard/travailleur");
    const liveMission = await (await call("/api/missions", 201, r, "POST", { ...mission, title: `${prefix}Actualisation`, date: "2038-12-20" })).json();
    await call(`/api/missions/${liveMission.id}/applications`, 201, a, "POST", {});
    await browser.evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Actualiser les statuts').click()");
    await browser.until("document.querySelector('[data-kpi=pending]').dataset.value==='1'"); check(true, "Worker dashboard refreshes after application");
    for (const [actor, path] of [[a, "/dashboard/travailleur"], [r, "/recruteur/dashboard"], [admin, "/dashboard/administrateur"]]) {
      await browser.cookie(actor.cookie); await browser.go(path);
      for (const width of [1440, 900, 390]) {
        await browser.cdp("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: width < 760 });
        if (width < 760) await browser.until("document.querySelector('.rq-sidebar').getBoundingClientRect().right <= 1");
        check(await browser.evaluate("document.documentElement.scrollWidth <= innerWidth"), `Responsive ${path} at ${width}`);
      }
    }
    check(await browser.evaluate("document.querySelectorAll('.qa-stat-chart').length===4"), "Four real-data Admin charts rendered");
    check(browser.errors.length === 0, "No browser exceptions");
  }
  console.log(`${checks} contrôles dashboards réussis : rapprochement Prisma, statuts, moyennes, rémunération, actualisation, comptes vides, permissions${browser ? ', navigateur et responsive' : ''}.`);
} finally {
  if (browser) await browser.close();
  const ids = users.map(u => u.id);
  await db.application.deleteMany({ where: { OR: [{ workerId: { in: ids } }, { mission: { recruiterId: { in: ids } } }] } });
  await db.mission.deleteMany({ where: { recruiterId: { in: ids } } });
  await db.user.deleteMany({ where: { id: { in: ids } } });
  await db.$disconnect();
}
