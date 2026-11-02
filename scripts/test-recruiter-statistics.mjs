import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { openWorkerBrowser } from "./worker-browser-session.mjs";

const base = process.env.TEST_BASE_URL;
const database = process.env.DASHBOARD_UI_DATABASE_URL;
assert.ok(base, "TEST_BASE_URL is required");
assert.ok(database?.replaceAll("\\", "/").includes("/.artifacts/"), "Use an isolated database under .artifacts");
const db = new PrismaClient({ datasourceUrl: database });
const prefix = `recruiter-statistics-${Date.now()}`;
const createdUsers = [];
let browser;
async function account(role, label) {
  const user = await db.user.create({ data: { name: label, firstName: label, role, email: `${prefix}-${label}@example.invalid`.toLowerCase(), password: await bcrypt.hash("Statistics-test123!", 10), ...(role === "RECRUTEUR" ? { recruiterVerification: { create: { status: "APPROUVE" } } } : {}) } });
  createdUsers.push(user.id);
  return user;
}
async function login(user) {
  const response = await fetch(`${base}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: user.email, password: "Statistics-test123!" }) });
  assert.equal(response.status, 200);
  return response.headers.get("set-cookie").split(";")[0];
}
try {
  const recruiter = await account("RECRUTEUR", "Recruiter"), other = await account("RECRUTEUR", "Other"), worker = await account("TRAVAILLEUR", "Worker");
  const now = new Date();
  const monthParts = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Tunis", year: "numeric", month: "2-digit" }).formatToParts(now);
  const year = Number(monthParts.find(p => p.type === "year").value), month = Number(monthParts.find(p => p.type === "month").value);
  const monthStart = new Date(`${year}-${String(month).padStart(2,"0")}-01T00:00:00+01:00`);
  const statuses = ["PUBLISHED", "FULL", "CLOSED", "IN_PROGRESS", "COMPLETED", "DRAFT", "CANCELLED", "MODERATED"];
  const applications = ["ACCEPTED", "ACCEPTED", "PENDING", "PENDING", "ACCEPTED", null, "REJECTED", null];
  for (let i = 0; i < statuses.length; i++) {
    const mission = await db.mission.create({ data: { recruiterId: recruiter.id, title: `Mission ${i}`, description: "Fixture de statistiques", status: statuses[i], category: i === 7 ? null : i % 2 ? "Commerce" : "Services", city: "Tunis" } });
    if (applications[i]) await db.application.create({ data: { missionId: mission.id, workerId: worker.id, status: applications[i], createdAt: i === 0 ? monthStart : i === 1 ? new Date(monthStart.getTime() - 1) : now } });
  }
  const foreign = await db.mission.create({ data: { recruiterId: other.id, title: "FOREIGN-PRIVATE-MISSION", description: "Not visible", status: "PUBLISHED", category: "FOREIGN-PRIVATE-CATEGORY" } });
  await db.application.create({ data: { missionId: foreign.id, workerId: worker.id, status: "ACCEPTED" } });
  const cookie = await login(recruiter);
  const warmup = await fetch(`${base}/recruteur/dashboard`, { headers: { Cookie: cookie } });
  assert.equal(warmup.status, 200);
  const html = await warmup.text();
  assert.ok(!html.includes("FOREIGN-PRIVATE"), "No foreign recruiter data");
  for (const [metric, expected] of Object.entries({ active: 4, applications: 6, recruitments: 3, selected: 1, completed: 1, totalMissions: 8, pending: 2, hired: 3, hiringRate: 50 })) {
    assert.equal(Number(new RegExp(`data-kpi="${metric}" data-value="([^"]+)"`).exec(html)?.[1]), expected, metric);
  }
  browser = await openWorkerBrowser(base);
  await browser.cookie(cookie);
  await browser.go("/recruteur/dashboard");
  const series = await browser.evaluate("[...document.querySelectorAll('.rqs-point')].map(g=>({label:g.querySelector('text').textContent,value:Number(g.getAttribute('aria-label').match(/: (\\d+)/)[1])}))");
  assert.equal(series.length, 6);
  for (let i = 0; i < 6; i++) {
    const start = new Date(Date.UTC(year, month - 6 + i, 1) - 3600000);
    const end = i === 5 ? new Date() : new Date(Date.UTC(year, month - 5 + i, 1) - 3600000);
    assert.equal(series[i].value, await db.application.count({ where: { mission: { recruiterId: recruiter.id }, createdAt: { gte: start, lt: end } } }), `Month ${i}, Tunisia boundary`);
  }
  assert.deepEqual(await browser.evaluate("[...document.querySelectorAll('.rqs-distribution li strong')].map(n=>n.textContent)"), ["50 % (4)", "12,5 % (1)", "37,5 % (3)"]);
  assert.equal(await browser.evaluate("[...document.querySelectorAll('.rqs-categories li>strong')].reduce((s,n)=>s+Number(n.textContent),0)"), 8);
  for (const width of [1440, 900, 390, 320]) {
    await browser.cdp("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: false });
    await browser.evaluate("document.fonts.ready");
    assert.ok(await browser.evaluate("document.documentElement.scrollWidth <= innerWidth"), `Overflow at ${width}`);
    assert.ok(await browser.evaluate("[...document.querySelectorAll('.rqd-rows .rq-badge')].every(n=>getComputedStyle(n).display!=='none')"), `Visible status badges at ${width}`);
    await browser.screenshot(`recruiter-statistics-${width}.png`);
  }
  await browser.cdp("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  assert.equal(await browser.evaluate("getComputedStyle(document.querySelector('.rqs-track>i')).animationName"), "none");
  const emptyCookie = await login(other);
  // Delete only this fixture's foreign records to exercise a truly empty account.
  await db.application.deleteMany({ where: { missionId: foreign.id } });
  await db.mission.delete({ where: { id: foreign.id } });
  await browser.cookie(emptyCookie);
  await browser.go("/recruteur/dashboard");
  assert.ok(await browser.evaluate("[...document.querySelectorAll('[data-kpi]')].every(n=>Number(n.dataset.value)===0)"));
  assert.equal(await browser.evaluate("document.querySelectorAll('.rqs-point').length"), 6);
  assert.ok(await browser.evaluate("!document.querySelector('.rqd-page').textContent.match(/NaN|Infinity/)"));
  assert.deepEqual(browser.errors, []);
  console.log("PASS recruiter statistics: scoped Prisma totals, Tunisia month boundaries, percentages, empty account, responsive 1440/900/390/320, status badges, reduced motion, no browser errors");
} finally {
  await browser?.close();
  await db.application.deleteMany({ where: { mission: { recruiterId: { in: createdUsers } } } });
  await db.mission.deleteMany({ where: { recruiterId: { in: createdUsers } } });
  await db.user.deleteMany({ where: { id: { in: createdUsers } } });
  await db.$disconnect();
}
