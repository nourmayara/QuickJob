import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { openWorkerBrowser } from "./worker-browser-session.mjs";

const base = process.env.TEST_BASE_URL, database = process.env.DASHBOARD_UI_DATABASE_URL;
assert.ok(base, "TEST_BASE_URL required");
assert.ok(database?.replaceAll("\\", "/").includes("/.artifacts/"), "Use an isolated database under .artifacts");
const db = new PrismaClient({ datasourceUrl: database });
const prefix = `missions-design-${Date.now()}`, ids = [];
let browser;
async function user(role, label) {
  const result = await db.user.create({ data: { name: label, firstName: label, role, email: `${prefix}-${label}@example.invalid`.toLowerCase(), password: await bcrypt.hash("Missions-test123!", 10), ...(role === "RECRUTEUR" ? { recruiterVerification: { create: { status: "APPROUVE" } } } : {}) } });
  ids.push(result.id); return result;
}
async function visit(query = "") {
  const route = `/recruteur/missions${query}`;
  await browser.go(route);
  await browser.until("!!document.querySelector('.rqm-page')");
}
try {
  const owner = await user("RECRUTEUR", "Owner"), other = await user("RECRUTEUR", "Other"), worker = await user("TRAVAILLEUR", "Worker"), pending = await user("TRAVAILLEUR", "Pending");
  const statuses = ["PUBLISHED", "FULL", "CLOSED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "DRAFT", "MODERATED"];
  const missions = [];
  for (let i = 0; i < 24; i++) missions.push(await db.mission.create({ data: { recruiterId: owner.id, title: `Mission ${String(i).padStart(2,"0")} — accueil & organisation`, description: "Fixture de présentation des missions", category: i % 2 ? "Commerce" : "Services", city: i % 2 ? "Sousse" : "Tunis", date: new Date("2030-12-15T00:00:00Z"), capacity: 3, status: statuses[i % 8] } }));
  await db.application.createMany({ data: [{ missionId: missions[0].id, workerId: worker.id, status: "ACCEPTED" }, { missionId: missions[0].id, workerId: pending.id, status: "PENDING" }] });
  await db.mission.create({ data: { recruiterId: other.id, title: "FOREIGN-PRIVATE-MISSION", description: "Not visible", category: "FOREIGN-CATEGORY", city: "FOREIGN-CITY" } });
  const response = await fetch(`${base}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: owner.email, password: "Missions-test123!" }) });
  assert.equal(response.status, 200);
  const cookie = response.headers.get("set-cookie").split(";")[0];
  const warmup = await fetch(`${base}/recruteur/missions`, { headers: { Cookie: cookie } });
  assert.equal(warmup.status, 200);
  const html = await warmup.text(); assert.ok(!html.includes("FOREIGN-"));
  browser = await openWorkerBrowser(base); await browser.cookie(cookie); await visit();
  assert.deepEqual(await browser.evaluate("[...document.querySelectorAll('[data-mission-kpi]')].map(n=>Number(n.dataset.value))"), [24,12,3,3]);
  assert.equal(await browser.evaluate("document.querySelectorAll('.rqm-card').length"),20);
  assert.equal(await browser.evaluate("document.querySelectorAll('.rqm-page table').length"),0);
  await visit("?view=grid&page=2");
  assert.equal(await browser.evaluate("document.querySelectorAll('.rqm-grid .rqm-card').length"),4);
  assert.ok(await browser.evaluate("document.querySelector('.rqm-view-switch a[aria-label=\"Vue liste\"]').href.includes('page=2')"));
  await visit("?q=Commerce&view=grid");
  assert.equal(await browser.evaluate("document.querySelectorAll('.rqm-card').length"),12);
  await visit("?q=Sousse");
  assert.equal(await browser.evaluate("document.querySelectorAll('.rqm-card').length"),12);
  await visit("?category=Services&city=Tunis&status=ACTIVE&view=grid");
  assert.equal(await browser.evaluate("document.querySelectorAll('.rqm-card').length"),6);
  assert.ok(await browser.evaluate("[...document.querySelectorAll('.rqm-tabs a,.rqm-view-switch a')].every(a=>a.href.includes('category=Services')&&a.href.includes('city=Tunis'))"));
  await visit("?q=does-not-exist");
  assert.equal(await browser.evaluate("document.querySelectorAll('.rqm-card').length"),0);
  assert.ok(await browser.evaluate("document.querySelector('.rq-empty').textContent.includes('Aucune mission trouvée')"));
  await visit("?page=9999");
  assert.equal(await browser.evaluate("document.querySelectorAll('.rqm-card').length"),4);
  for (const view of ["list", "grid"]) {
    await visit(`?view=${view}`);
    for (const width of [1440, 900, 390, 320]) {
      await browser.cdp("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor:1, mobile:false });
      await browser.evaluate("document.fonts.ready");
      assert.ok(await browser.evaluate("document.documentElement.scrollWidth<=innerWidth"), `${view} overflow at ${width}`);
      assert.ok(await browser.evaluate("[...document.querySelectorAll('.rqm-card>.rq-badge')].every(n=>getComputedStyle(n).display!=='none')"));
      await browser.screenshot(`missions-design-${view}-${width}.png`);
    }
  }
  await browser.cdp("Emulation.setDeviceMetricsOverride", { width:1440,height:1000,deviceScaleFactor:1,mobile:false });
  await visit("?status=PUBLISHED");
  const id = await browser.evaluate("Number(document.querySelector('.rqm-card').dataset.missionId)");
  assert.equal(await browser.evaluate("document.querySelectorAll('.rqm-card .rqm-actions a[title=Modifier]').length"),3);
  await browser.evaluate("document.querySelector('.rqm-cancel>button').click()");
  await browser.until("!!document.querySelector('[role=dialog]')");
  assert.ok(await browser.evaluate("(()=>{const r=document.querySelector('[role=dialog]').getBoundingClientRect();return r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight})()"));
  await browser.cdp("Input.dispatchKeyEvent", { type:"keyDown",key:"Escape",code:"Escape",windowsVirtualKeyCode:27 });
  await browser.until("!document.querySelector('[role=dialog]')");
  await browser.evaluate("document.querySelector('.rqm-cancel>button').click()");
  await browser.until("!!document.querySelector('[role=dialog]')");
  await browser.evaluate("[...document.querySelectorAll('[role=dialog] button')].find(n=>n.textContent==='Confirmer').click()");
  await browser.until("!document.querySelector('[role=dialog]')");
  assert.equal((await db.mission.findUniqueOrThrow({where:{id}})).status,"CANCELLED");
  assert.deepEqual(browser.errors,[]);
  console.log("PASS recruiter missions: scoped KPIs, category/city/search/status filters, list/grid, pagination, empty state, responsive 1440/900/390/320, edit links, cancellation confirmation and Escape, no browser errors");
} finally {
  await browser?.close();
  await db.application.deleteMany({where:{mission:{recruiterId:{in:ids}}}});
  await db.mission.deleteMany({where:{recruiterId:{in:ids}}});
  await db.user.deleteMany({where:{id:{in:ids}}});
  await db.$disconnect();
}
