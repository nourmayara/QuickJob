import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import env from "@next/env";
import { openWorkerBrowser } from "./worker-browser-session.mjs";
env.loadEnvConfig(process.cwd());
const db = new PrismaClient(), base = process.env.TEST_BASE_URL || "http://localhost:3100", prefix = `calendar-${Date.now()}-`, users = [];
let checks = 0, browser;
const check = (v, label) => { assert.ok(v, label); checks++; };
async function call(path, code, actor, method = "GET", body) {
  const response = await fetch(base + path, { method, redirect: "manual", headers: { ...(actor ? { Cookie: actor.cookie } : {}), "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.clone().text();
  check(response.status === code, `${method} ${path}: ${response.status}, expected ${code}: ${text.slice(0, 250)}`);
  if (response.headers.get("content-type")?.includes("application/json")) check(!/"(?:password|sessions|token)"\s*:/.test(text), "No secrets");
  return response;
}
async function account(label, role) {
  const response = await call("/api/auth/register", 201, null, "POST", { name: "Recette", firstName: label, email: `${prefix}${label}@example.invalid`, phone: "+216 12345678", password: "test-password123", confirmPassword: "test-password123", acceptTerms: true, role, ...(role === "RECRUTEUR" ? { recruiterType: "INDIVIDUAL" } : {}) });
  const actor = { ...await response.json(), cookie: response.headers.get("set-cookie").split(";")[0] }; users.push(actor);
  if (role === "RECRUTEUR") await db.recruiterVerification.update({ where: { userId: actor.id }, data: { status: "APPROUVE" } });
  return actor;
}
const sp = "/api/travailleur/disponibilites", fp = "/api/travailleur/favoris", cp = "/api/travailleur/calendrier?month=2036-01";
const slot = { date: "2036-01-15", startTime: "08:00", endTime: "18:00", kind: "AVAILABLE", note: "Disponible" };
const mission = { title: `${prefix}Accueil`, description: "Accueil des visiteurs pendant une journée.", category: "Services", city: "Tunis", address: "10 rue des Fleurs", date: slot.date, startTime: "09:00", endTime: "12:00", pay: 90, capacity: 3, skills: "Accueil", status: "PUBLISHED" };
const calendar = async actor => (await call(cp, 200, actor)).json();
const create = async (actor, extra = {}) => (await call("/api/missions", 201, actor, "POST", { ...mission, ...extra })).json();
const apply = async (actor, m) => (await call(`/api/missions/${m.id}/applications`, 201, actor, "POST", {})).json();
const accept = (actor, app, code = 200) => call(`/api/applications/${app.id}`, code, actor, "PATCH", { status: "ACCEPTED" });
try {
  const r = await account("Recruiter", "RECRUTEUR"), r2 = await account("OtherRecruiter", "RECRUTEUR"), a = await account("Amira", "TRAVAILLEUR"), b = await account("Sami", "TRAVAILLEUR"), c = await account("Lina", "TRAVAILLEUR");
  for (const path of [sp, fp, cp]) { await call(path, 401); await call(path, 403, r); }
  for (const bad of [{ date: "2036-02-31" }, { startTime: "25:00" }, { endTime: "07:00" }, { endTime: "08:00" }, { workerId: b.id }, { kind: "FAKE" }]) await call(sp, 400, a, "POST", { ...slot, ...bad });
  const s = await (await call(sp, 201, a, "POST", slot)).json();
  check(s.startAt === "2036-01-15T07:00:00.000Z", "Tunis stored in UTC");
  await call(sp, 409, a, "POST", { ...slot, startTime: "10:00", endTime: "11:00", kind: "UNAVAILABLE" });
  await call(`${sp}/${s.id}`, 404, b, "PATCH", slot); await call(`${sp}/${s.id}`, 404, b, "DELETE");
  await call(`${sp}/${s.id}`, 200, a, "PATCH", { ...slot, startTime: "07:00" });
  check((await calendar(a)).events.some(e => e.slotId === s.id && e.startTime === "07:00"), "Edited slot reloaded");
  check((await calendar(b)).events.length === 0, "Calendar isolation");
  const midnight = await (await call(sp, 201, a, "POST", { ...slot, date: "2036-01-01", startTime: "00:00", endTime: "01:00" })).json();
  check(midnight.startAt === "2035-12-31T23:00:00.000Z" && (await calendar(a)).events.some(e => e.slotId === midnight.id && e.date === "2036-01-01"), "Month boundary uses Tunis timezone");
  await call(`${sp}/${midnight.id}`, 200, a, "DELETE");
  const m1 = await create(r), m2 = await create(r2, { title: `${prefix}Overlap`, startTime: "11:00", endTime: "14:00" }), m3 = await create(r2, { title: `${prefix}Adjacent`, startTime: "12:00", endTime: "14:00" });
  const p1 = await apply(a, m1), p2 = await apply(a, m2), p3 = await apply(a, m3);
  check((await calendar(a)).events.filter(e => e.type === "PENDING").length === 3, "Pending events synchronized");
  await accept(r, p1);
  check((await calendar(a)).events.some(e => e.id === `application-${p1.id}` && e.type === "ACCEPTED" && e.startAt === "2036-01-15T08:00:00.000Z"), "Confirmed event synchronized");
  await accept(r2, p2, 409);
  check((await db.application.findUniqueOrThrow({ where: { id: p2.id } })).status === "PENDING", "Conflict rolls back acceptance");
  await call(`${sp}/${s.id}`, 409, a, "PATCH", { ...slot, kind: "UNAVAILABLE" });
  await call(`${sp}/${s.id}`, 200, a, "DELETE");
  await call(sp, 409, a, "POST", { ...slot, startTime: "10:00", endTime: "11:00", kind: "UNAVAILABLE" });
  await accept(r2, p3);
  await call(`/api/missions/${m3.id}`, 409, r2, "PATCH", { startTime: "11:30" });
  check((await db.mission.findUniqueOrThrow({ where: { id: m3.id } })).startTime === "12:00", "Reschedule conflict rolls back");
  const u = await (await call(sp, 201, b, "POST", { ...slot, kind: "UNAVAILABLE" })).json();
  const bp = await apply(b, m1); await accept(r, bp, 409);
  await call(`${sp}/${u.id}`, 200, b, "DELETE"); await accept(r, bp);
  await call(`/api/applications/${bp.id}`, 200, b, "PATCH", { status: "CANCELLED" });
  check(!(await calendar(b)).events.some(e => e.id === `application-${bp.id}`), "Withdrawal synchronizes calendar");
  const c1 = await apply(c, m1), c2 = await apply(c, m2);
  const race = await Promise.all([[r, c1], [r2, c2]].map(([actor, app]) => fetch(`${base}/api/applications/${app.id}`, { method: "PATCH", headers: { Cookie: actor.cookie, "Content-Type": "application/json" }, body: JSON.stringify({ status: "ACCEPTED" }) })));
  check(race.filter(x => x.status === 200).length === 1 && race.filter(x => x.status === 409).length === 1, "Concurrent cross-mission confirmations cannot overlap");
  check(await db.application.count({ where: { workerId: c.id, status: "ACCEPTED" } }) === 1, "Single reservation after race");
  await call(`${fp}/${m3.id}`, 200, a, "PUT"); await call(`${fp}/${m3.id}`, 200, a, "PUT");
  check(await db.favorite.count({ where: { workerId: a.id, missionId: m3.id } }) === 1, "Favorite uniqueness");
  check((await (await call(fp, 200, a)).json()).some(f => f.mission.id === m3.id), "Favorite persists");
  check((await (await call(fp, 200, b)).json()).length === 0, "Favorite isolation");
  await call(`${fp}/${m3.id}`, 200, b, "DELETE");
  check(await db.favorite.count({ where: { workerId: a.id } }) === 1, "Other worker cannot delete favorite");
  await call(`${fp}/${m3.id}`, 403, r, "PUT"); await call(`${fp}/${m3.id}`, 200, a, "DELETE");
  await call("/api/travailleur/calendrier?month=2036-13", 400, a);
  if (process.env.TEST_BROWSER !== "0") {
    browser = await openWorkerBrowser(base); await browser.cookie(a.cookie);
    await browser.cdp("Emulation.setTimezoneOverride", { timezoneId: "America/New_York" });
    await browser.go("/dashboard/travailleur/calendrier?month=2036-01");
    check(await browser.evaluate("document.querySelectorAll('.wk-calendar-event.accepted').length >= 3 && document.querySelectorAll('.wk-calendar-event.pending').length >= 2"), "Blue pending and purple accepted events");
    await browser.evaluate("(() => { const values={date:'2036-01-20',startTime:'08:00',endTime:'10:00',kind:'AVAILABLE',note:'Créneau navigateur'}; for(const [key,value] of Object.entries(values)) document.querySelector('form [name='+key+']').value=value; document.querySelector('.rq-form .rq-form-actions button:not([type=button])').click(); })()");
    await browser.until("!!document.querySelector('.rq-success') && [...document.querySelectorAll('.wk-calendar-day .available')].some(e=>e.textContent.includes('08:00'))");
    const bs = await db.availability.findFirstOrThrow({ where: { workerId: a.id, note: "Créneau navigateur" } });
    check(bs.startAt.toISOString() === "2036-01-20T07:00:00.000Z", "Browser timezone does not shift Tunis time");
    await browser.evaluate(`document.querySelector('[data-event-id="slot-${bs.id}"]').click()`);
    await browser.until("document.body.textContent.includes('Modifier ce créneau')");
    await browser.evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Modifier ce créneau').click()");
    await browser.until("document.body.textContent.includes('Modifier mon créneau')");
    await browser.evaluate("document.querySelector('form [name=endTime]').value='11:00'; document.querySelector('.rq-form .rq-form-actions button:not([type=button])').click()");
    await browser.until("[...document.querySelectorAll('.wk-calendar-day .available')].some(e=>e.textContent.includes('11:00'))");
    check((await db.availability.findUniqueOrThrow({ where: { id: bs.id } })).endAt.toISOString() === "2036-01-20T10:00:00.000Z", "Browser edit persists");
    await browser.evaluate(`document.querySelector('[data-event-id="application-${p1.id}"]').click()`);
    await browser.until("document.body.textContent.includes('Voir la candidature et la mission')");
    for (const width of [1440, 900, 390]) {
      await browser.cdp("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: width < 760 });
      if (width < 760) await browser.until("document.querySelector('.rq-sidebar').getBoundingClientRect().right <= 1");
      check(await browser.evaluate("document.documentElement.scrollWidth <= innerWidth"), `Responsive calendar ${width}`);
    }
    await browser.go(`/dashboard/travailleur/missions/${m3.id}`); await browser.evaluate("document.querySelector('.wk-favorite').click()");
    await browser.until("document.querySelector('.wk-favorite').getAttribute('aria-pressed')==='true'");
    await browser.go("/dashboard/travailleur/favoris");
    check(await browser.evaluate(`document.body.textContent.includes(${JSON.stringify(m3.title)})`), "Favorite reloaded in browser");
    await browser.evaluate("document.querySelector('.wk-favorite').click()"); await browser.until("document.body.textContent.includes('Aucun favori')");
    check(await db.favorite.count({ where: { workerId: a.id } }) === 0, "Browser favorite removal");
    check(browser.errors.length === 0, "No browser exceptions");
  }
  console.log(`${checks} contrôles calendrier réussis : disponibilités, fuseaux, conflits, concurrence, favoris${browser ? ', navigateur et responsive' : ''}.`);
} finally {
  if (browser) await browser.close();
  const ids = users.map(u => u.id);
  await db.application.deleteMany({ where: { OR: [{ workerId: { in: ids } }, { mission: { recruiterId: { in: ids } } }] } });
  await db.mission.deleteMany({ where: { recruiterId: { in: ids } } });
  await db.user.deleteMany({ where: { id: { in: ids } } });
  await db.$disconnect();
}
