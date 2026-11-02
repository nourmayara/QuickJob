import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";
import env from "@next/env";
import { openWorkerBrowser } from "./worker-browser-session.mjs";
env.loadEnvConfig(process.cwd());
const db = new PrismaClient(), base = process.env.TEST_BASE_URL || "http://localhost:3100";
const users = [], prefix = `bell-${Date.now()}`;
let browser, checks = 0;
function check(value, label) { assert.ok(value, label); checks++; }
async function actor(role) {
  const user = await db.user.create({ data: { name: "Notifications", firstName: role, role, email: `${prefix}-${role}@example.invalid`, password: "unused", ...(role === "RECRUTEUR" ? { recruiterVerification: { create: { status: "APPROUVE" } } } : {}) } });
  users.push(user.id);
  const sessionId = randomUUID();
  await db.session.create({ data: { id: sessionId, userId: user.id, expiresAt: new Date(Date.now() + 3600000) } });
  const token = await new SignJWT({ userId: user.id, sessionId }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1h").sign(new TextEncoder().encode(process.env.JWT_SECRET));
  return { ...user, cookie: `session=${token}` };
}
async function call(user, method = "GET", body) {
  return fetch(`${base}/api/notifications`, { method, headers: { ...(user ? { Cookie: user.cookie } : {}), "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
}
try {
  const worker = await actor("TRAVAILLEUR"), recruiter = await actor("RECRUTEUR"), admin = await actor("ADMIN");
  const mission = await db.mission.create({ data: { recruiterId: recruiter.id, title: prefix, description: "Test notifications" } });
  const application = await db.application.create({ data: { missionId: mission.id, workerId: worker.id, status: "ACCEPTED" } });
  for (const user of [worker, recruiter, admin]) {
    await db.notification.createMany({ data: [
      { userId: user.id, kind: "MISSION", missionId: mission.id, message: "Mission actualisée", createdAt: new Date(Date.now() - 30000) },
      { userId: user.id, kind: user.role === "ADMIN" ? "VERIFICATION" : "MESSAGE", applicationId: application.id, message: "Nouvelle notification", createdAt: new Date() },
    ] });
    const response = await call(user), rows = await response.json();
    check(response.status === 200 && rows.length === 2 && response.headers.get("X-Unread-Count") === "2", `${user.role}: private feed and unread count`);
    check(rows[0].createdAt >= rows[1].createdAt && rows.every(n => n.title && n.icon && n.href), "Sorted, enriched notifications");
    check(rows[0].href === (user.role === "ADMIN" ? "/admin/recruteurs" : `${user.role === "RECRUTEUR" ? "/recruteur" : "/dashboard/travailleur"}/messages?application=${application.id}`), "Role-specific destination");
  }
  check((await call(null)).status === 401, "Anonymous access denied");
  const foreign = (await (await call(recruiter)).json())[0];
  check((await call(worker, "PATCH", { id: foreign.id })).status === 404, "Cannot read another user's notification");
  browser = await openWorkerBrowser(base);
  // Cold Next development compilations can exceed the shared browser helper's 15s.
  browser.until = async expression => {
    const deadline = Date.now() + 60000;
    while (Date.now() < deadline) {
      if (await browser.evaluate(expression)) return;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`Browser condition failed: ${expression}`);
  };
  for (const [user, path] of [[worker, "/dashboard/travailleur"], [recruiter, "/recruteur/dashboard"], [admin, "/dashboard/administrateur"]]) {
    await (await fetch(base + path, { headers: { Cookie: user.cookie } })).text();
    const warmTarget = user.role === "ADMIN" ? "/admin/recruteurs" : `${user.role === "RECRUTEUR" ? "/recruteur" : "/dashboard/travailleur"}/messages?application=${application.id}`;
    await (await fetch(base + warmTarget, { headers: { Cookie: user.cookie } })).text();
    await browser.cookie(user.cookie);
    await browser.cdp("Page.navigate", { url: base + path });
    await browser.until(`location.pathname === ${JSON.stringify(path)} && !!document.querySelector('.qj-bell')`);
    await browser.until("document.querySelector('.qj-bell')?.getAttribute('aria-label').includes('2 non lues')");
    await browser.evaluate("document.querySelector('.qj-bell').click()");
    await browser.until("document.querySelectorAll('.qj-bell-item').length === 2 && !document.querySelector('.qj-bell-panel').getAttribute('aria-busy').includes('true')");
    check(await browser.evaluate("location.pathname === " + JSON.stringify(path)), "Opening stays on the current page");
    await browser.cdp("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" });
    check(await browser.evaluate("!document.querySelector('.qj-bell-panel') && document.activeElement.matches('.qj-bell')"), "Escape closes and restores focus");
    await browser.evaluate("document.querySelector('.qj-bell').click()");
    await browser.until("document.querySelector('.qj-bell-panel') && document.querySelector('.qj-bell-panel').getAttribute('aria-busy') === 'false'");
    await browser.cdp("Input.dispatchMouseEvent", { type: "mousePressed", x: 400, y: 700, button: "left", clickCount: 1 });
    await browser.cdp("Input.dispatchMouseEvent", { type: "mouseReleased", x: 400, y: 700, button: "left", clickCount: 1 });
    check(await browser.evaluate("!document.querySelector('.qj-bell-panel')"), "Outside click closes");
    await browser.cdp("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await browser.evaluate("document.querySelector('.qj-bell').click()");
    await browser.until("document.querySelector('.qj-bell-panel')?.getAttribute('aria-busy') === 'false'");
    check(await browser.evaluate("(() => { const r=document.querySelector('.qj-bell-panel').getBoundingClientRect();return r.left>=0 && r.right<=innerWidth; })()"), "Mobile popover fits viewport");
    await browser.evaluate("Promise.all(document.querySelector('.qj-bell-panel').getAnimations().map(a => a.finished.catch(() => {})))");
    await browser.screenshot(`notifications-${user.role.toLowerCase()}-mobile.png`);
    await browser.evaluate("document.querySelector('.qj-bell-item').click()");
    const target = user.role === "ADMIN" ? "/admin/recruteurs" : `${user.role === "RECRUTEUR" ? "/recruteur" : "/dashboard/travailleur"}/messages`;
    try { await browser.until(`location.pathname === ${JSON.stringify(target)} && !document.querySelector('.qj-bell-panel')`); }
    catch (error) { console.log("Navigation diagnostics", browser.errors, await browser.evaluate("JSON.stringify({url:location.href,body:document.body.innerText.slice(-1200)})")); await browser.screenshot("notification-failure.png"); throw error; }
    check((await call(user)).headers.get("X-Unread-Count") === "1", "Click persists read before navigation");
    await browser.until("document.readyState === 'complete' && document.querySelector('.qj-bell')?.getAttribute('aria-label').includes('1 non lues')");
    await browser.evaluate("document.querySelector('.qj-bell').click()");
    await browser.until("document.querySelector('.qj-bell-panel')?.getAttribute('aria-busy') === 'false'");
    await browser.evaluate("document.querySelector('.qj-bell-read-all').click()");
    await browser.until("document.querySelector('.qj-bell-heading span')?.textContent === '0 non lues'");
    check((await call(user)).headers.get("X-Unread-Count") === "0", "Mark all persists");
    await browser.cdp("Emulation.clearDeviceMetricsOverride");
  }
  check(browser.errors.length === 0, "No browser runtime errors");
  console.log(`${checks} notification checks passed`);
} finally {
  await browser?.close();
  await db.message.deleteMany({ where: { senderId: { in: users } } });
  await db.application.deleteMany({ where: { workerId: { in: users } } });
  await db.mission.deleteMany({ where: { recruiterId: { in: users } } });
  await db.user.deleteMany({ where: { id: { in: users } } });
  await db.$disconnect();
}
