import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import env from "@next/env";
import { openWorkerBrowser } from "./worker-browser-session.mjs";
env.loadEnvConfig(process.cwd());
const db = new PrismaClient(), base = process.env.TEST_BASE_URL || "http://localhost:3100";
const prefix = `missions-${Date.now()}-`, users = [];
let checks = 0, browser;
const check = (value, message) => { assert.ok(value, message); checks++; };
async function call(path, code, actor, method = "GET", body) {
  const response = await fetch(base + path, { method, redirect: "manual", headers: { ...(actor ? { Cookie: actor.cookie } : {}), "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.clone().text();
  check(response.status === code || (code === 404 && response.status === 200 && text.includes("NEXT_HTTP_ERROR_FALLBACK;404")), `${method} ${path}: ${response.status}, expected ${code}: ${text.slice(0, 250)}`);
  if (response.headers.get("content-type")?.includes("application/json")) check(!/"(?:password|sessions|token)"\s*:/.test(text), "No sensitive fields");
  return response;
}
async function account(label, role, approved = false) {
  const response = await call("/api/auth/register", 201, null, "POST", { name: "Recette", firstName: label, email: `${prefix}${label}@example.invalid`, phone: "+216 12345678", password: "test-password123", confirmPassword: "test-password123", acceptTerms: true, role, ...(role === "RECRUTEUR" ? { recruiterType: "INDIVIDUAL" } : {}) });
  const actor = { ...await response.json(), cookie: response.headers.get("set-cookie").split(";")[0] };
  users.push(actor);
  if (approved) await db.recruiterVerification.update({ where: { userId: actor.id }, data: { status: "APPROUVE" } });
  return actor;
}
const body = { title: `${prefix}Accueil`, description: "Accueil des visiteurs et préparation des tables.", category: "Restauration", city: "Tunis", address: "10 rue des Fleurs", date: "2035-12-15", startTime: "09:00", endTime: "17:00", pay: 90, capacity: 2, skills: "Service, accueil", experience: "Une première expérience souhaitée", status: "PUBLISHED" };
async function results(worker, query = {}) { return (await call(`/api/missions?${new URLSearchParams({ q: prefix, ...query })}`, 200, worker)).json(); }
try {
  const recruiter = await account("approved", "RECRUTEUR", true), other = await account("other", "RECRUTEUR", true), pending = await account("pending", "RECRUTEUR"), worker = await account("worker", "TRAVAILLEUR"), admin = await account("admin", "TRAVAILLEUR");
  await db.user.update({ where: { id: admin.id }, data: { role: "ADMIN" } });
  for (const [actor, code] of [[null, 401], [worker, 403], [admin, 403], [pending, 403]]) await call("/api/missions", code, actor, "POST", body);
  for (const bad of [{ title: "ab" }, { description: "court" }, { date: "2035-02-31" }, { date: "2020-01-01" }, { endTime: "08:00" }, { startTime: "25:00" }, { pay: -1 }, { pay: "90" }, { capacity: 0 }, { capacity: 1.5 }, { recruiterId: other.id }]) await call("/api/missions", 400, recruiter, "POST", { ...body, ...bad });
  await call("/api/missions", 400, recruiter, "POST", { title: body.title, description: body.description });
  const draft = await (await call("/api/missions", 201, recruiter, "POST", { title: `${prefix}Brouillon`, description: body.description, status: "DRAFT" })).json();
  await call(`/api/missions/${draft.id}`, 400, recruiter, "PATCH", { status: "PUBLISHED" });
  check((await results(worker)).length === 0, "Draft not searchable");
  await call(`/api/missions/${draft.id}`, 200, recruiter, "PATCH", body);
  const id = draft.id;
  check((await results(worker)).some(m => m.id === id), "Published draft is searchable");
  for (const [key, value] of Object.entries(body)) {
    const stored = await db.mission.findUniqueOrThrow({ where: { id } });
    assert.equal(key === "date" ? stored.date.toISOString().slice(0, 10) : stored[key], value);
  }
  const combined = { category: "Restauration", city: "Tunis", date: body.date, payMin: "80", payMax: "100" };
  check((await results(worker, combined)).length === 1, "Combined filters");
  for (const filters of [{ category: "Logistique" }, { city: "Sfax" }, { date: "2035-12-16" }, { payMin: "95" }, { payMax: "85" }]) check((await results(worker, filters)).length === 0, "Excluding filter");
  for (const query of ["date=2035-02-31", "payMin=-1", "payMin=100&payMax=90", "payMax=abc", "page=0"]) await call(`/api/missions?${query}`, 400, worker);
  await call(`/api/missions/${id}`, 200, worker);
  for (const [actor, code] of [[null, 401], [worker, 403], [admin, 403], [pending, 403], [other, 404]]) await call(`/api/missions/${id}`, code, actor, "PATCH", { title: "Interdit" });
  await call(`/recruteur/missions/${id}/modifier`, 404, other);
  const application = await db.application.create({ data: { workerId: worker.id, missionId: id, status: "ACCEPTED" } });
  for (const invalid of [{ endTime: "08:00" }, { startTime: "18:00" }, { date: "2020-01-01" }, { pay: -1 }, { capacity: 0 }]) await call(`/api/missions/${id}`, 400, recruiter, "PATCH", invalid);
  await call(`/api/missions/${id}`, 200, recruiter, "PATCH", { title: `${prefix}Modifiée`, city: "Sfax", pay: 120, capacity: 1 });
  check((await db.mission.findUniqueOrThrow({ where: { id } })).status === "FULL", "Capacity respects accepted applications");
  check((await results(worker)).length === 0, "Full mission unavailable");
  await call(`/api/missions/${id}`, 200, recruiter, "PATCH", { capacity: 3 });
  check((await results(worker, { city: "Sfax", payMin: "120" })).length === 1, "Edits searchable");
  for (const status of ["EN_ATTENTE", "REFUSE"]) {
    await db.recruiterVerification.update({ where: { userId: recruiter.id }, data: { status } });
    check((await results(worker)).length === 0, "Unapproved recruiter hidden");
    await call(`/api/missions/${id}`, 403, recruiter, "PATCH", { title: "Interdit" });
  }
  await db.recruiterVerification.update({ where: { userId: recruiter.id }, data: { status: "APPROUVE" } });
  await db.user.update({ where: { id: recruiter.id }, data: { suspended: true } });
  check((await results(worker)).length === 0, "Suspended recruiter hidden");
  await call("/api/missions", 401, recruiter, "POST", body);
  await call(`/api/missions/${id}`, 401, recruiter, "PATCH", { title: "Interdit" });
  await db.user.update({ where: { id: recruiter.id }, data: { suspended: false } });
  for (const status of ["DRAFT", "MODERATED", "CANCELLED", "CLOSED", "COMPLETED", "IN_PROGRESS"]) {
    await db.mission.update({ where: { id }, data: { status } });
    check((await results(worker)).length === 0, `${status} unavailable`);
    await call(`/api/missions/${id}`, 404, other);
  }
  await db.mission.update({ where: { id }, data: { status: "PUBLISHED" } });
  await call(`/api/missions/${id}`, 200, recruiter, "PATCH", { status: "CLOSED" });
  await call(`/api/missions/${id}`, 409, recruiter, "PATCH", { title: "Non modifiable" });
  await call(`/api/missions/${id}`, 409, recruiter, "PATCH", { status: "PUBLISHED" });
  await call(`/api/missions/${id}`, 200, recruiter, "PATCH", { status: "CANCELLED" });
  await call(`/api/missions/${id}`, 404, recruiter, "PATCH", { title: "Non modifiable" });
  check((await db.application.findUniqueOrThrow({ where: { id: application.id } })).status === "ACCEPTED", "Cancellation preserves application");
  check((await results(worker)).length === 0, "Cancellation removes availability");
  await call(`/api/missions/${id}`, 200, worker); // Existing applicant retains history.
  if (process.env.TEST_BROWSER !== "0") {
    browser = await openWorkerBrowser(base);
    await browser.cookie(recruiter.cookie);
    await browser.go("/recruteur/missions/nouvelle");
    await browser.evaluate(`(() => { const values=${JSON.stringify({ ...body, title: `${prefix}Navigateur` })}; for (const [key,value] of Object.entries(values)) { const field=document.querySelector('form [name='+key+']'); if(field) field.value=value; } document.querySelector('button[value=PUBLISHED]').click(); })()`);
    await browser.until("/^\\/recruteur\\/missions\\/\\d+$/.test(location.pathname) && document.body.textContent.includes('Navigateur')");
    const created = await db.mission.findFirstOrThrow({ where: { title: `${prefix}Navigateur`, recruiterId: recruiter.id } });
    check(created.status === "PUBLISHED", "Browser publication persists");
    await browser.go(`/recruteur/missions/${created.id}/modifier`);
    await browser.evaluate(`(() => { document.querySelector('[name=city]').value='Sousse'; document.querySelector('[name=pay]').value='110'; document.querySelector('button[value=PUBLISHED]').click(); })()`);
    await browser.until(`location.pathname === '/recruteur/missions/${created.id}' && document.body.textContent.includes('Sousse')`);
    check((await db.mission.findUniqueOrThrow({ where: { id: created.id } })).pay === 110, "Browser modification persists");
    await browser.cookie(worker.cookie);
    await browser.go(`/dashboard/travailleur/missions?q=${prefix}`);
    await browser.evaluate(`(() => { const values={city:'Sousse',category:'Restauration',date:'2035-12-15',payMin:'100',payMax:'120'}; for(const [key,value] of Object.entries(values)) document.querySelector('[name='+key+']').value=value; document.querySelector('.wk-search button').click(); })()`);
    await browser.until("location.search.includes('Sousse') && document.querySelectorAll('.wk-mission-card').length===1");
    check(true, "Browser combined filters");
    for (const width of [1440, 900, 390]) {
      await browser.cdp("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: width < 760 });
      if (width < 760) await browser.until("document.querySelector('.rq-sidebar').getBoundingClientRect().right <= 1");
      check(await browser.evaluate("document.documentElement.scrollWidth <= innerWidth"), `Responsive search ${width}`);
    }
    await browser.evaluate(`document.querySelector('a[href="/dashboard/travailleur/missions"]').click()`);
    await browser.until("location.search==='' && !!document.querySelector('.wk-search')");
    check(await browser.evaluate("document.querySelector('[name=city]').value==='' && document.querySelector('[name=payMin]').value===''") , "Reset clears filters");
    await browser.go(`/dashboard/travailleur/missions/${created.id}`);
    for (const value of [body.description, body.address, "Sousse", "110", body.skills, body.experience]) check(await browser.evaluate(`document.body.textContent.includes(${JSON.stringify(value)})`), `Detail displays ${value}`);
    check(await browser.evaluate("document.documentElement.scrollWidth <= innerWidth"), "Responsive detail");
    await browser.go(`/dashboard/travailleur/missions?q=${prefix}absent`);
    check(await browser.evaluate("document.body.textContent.includes('Aucune mission à afficher')"), "Empty results state");
    await browser.cookie(recruiter.cookie);
    await browser.go(`/recruteur/missions/${created.id}`);
    await browser.evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Annuler').click()");
    await browser.until("!!document.querySelector('[role=dialog]')");
    await browser.evaluate("[...document.querySelectorAll('[role=dialog] button')].find(b=>b.textContent==='Confirmer').click()");
    await browser.until("!document.querySelector('[role=dialog]') && document.body.textContent.includes('Annulée')");
    check((await db.mission.findUniqueOrThrow({ where: { id: created.id } })).status === "CANCELLED", "Browser cancellation persists");
    check((await results(worker)).length === 0, "Browser cancelled mission hidden");
    check(browser.errors.length === 0, `Browser exceptions: ${browser.errors}`);
  }
  console.log(`${checks} contrôles missions réussis (API, Prisma${browser ? ', navigateur et responsive' : ''}).`);
} finally {
  if (browser) await browser.close();
  const ids = users.map(user => user.id);
  await db.application.deleteMany({ where: { OR: [{ workerId: { in: ids } }, { mission: { recruiterId: { in: ids } } }] } });
  await db.mission.deleteMany({ where: { recruiterId: { in: ids } } });
  await db.user.deleteMany({ where: { id: { in: ids } } });
  await db.$disconnect();
}
