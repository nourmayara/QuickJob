// Browser QA without an additional runtime dependency. Uses Chrome's CDP protocol.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const db = new PrismaClient();
const base = process.env.TEST_BASE_URL || "http://localhost:3100";
const email = `browser-recruiter-${Date.now()}@example.invalid`;
const directory = await mkdtemp(path.join(tmpdir(), "quickjob-browser-"));
const browser = spawn(process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe", ["--headless=new", "--disable-gpu", "--no-sandbox", "--no-first-run", "--no-default-browser-check", "--remote-debugging-port=0", `--user-data-dir=${directory}`, "about:blank"], { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
let browserFailure;
browser.on("error", error => { browserFailure = error; });
let debugUrl = "";
browser.stderr.on("data", data => { debugUrl ||= String(data).match(/DevTools listening on (ws:\/\/\S+)/)?.[1] || ""; });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let socket;
const runtimeErrors = [];
let id = 0;
const pending = new Map();
async function cdp(method, params = {}) {
  return new Promise((resolve, reject) => {
    const next = ++id;
    const timer = setTimeout(() => { pending.delete(next); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
    pending.set(next, { resolve: value => { clearTimeout(timer); resolve(value); }, reject });
    socket.send(JSON.stringify({ id: next, method, params }));
  });
}
async function evaluate(expression) {
  const r = await cdp("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
  return r.result?.value;
}
async function until(expression) {
  for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await delay(100); }
  const details = await evaluate("JSON.stringify({url:location.href,heading:document.querySelector('h1')?.textContent,alerts:[...document.querySelectorAll('[role=alert]')].map(e=>e.textContent),invalid:[...document.querySelectorAll('input,select,textarea')].filter(e=>!e.validity.valid).map(e=>({name:e.name,value:e.value,message:e.validationMessage}))})");
  throw new Error(`Browser condition failed: ${expression}; ${details}`);
}
async function go(route) {
  await cdp("Page.navigate", { url: base + route });
  await until(`location.pathname === ${JSON.stringify(route)} && document.readyState === 'complete' && !!document.querySelector('.rq-app')`);
  await delay(250);
}
async function screenshot(name) {
  const result = await cdp("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile(path.join(process.cwd(), ".artifacts", name), Buffer.from(result.data, "base64"));
}
try {
  for (let i = 0; i < 100 && !debugUrl; i++) { if (browserFailure) throw browserFailure; await delay(100); }
  assert.ok(debugUrl, "Chrome did not expose a debugging endpoint");
  const port = new URL(debugUrl).port;
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(targets.find(t => t.type === "page").webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) { const p = pending.get(message.id); pending.delete(message.id); message.error ? p.reject(new Error(message.error.message)) : p.resolve(message.result); }
    if (message.method === "Runtime.exceptionThrown") runtimeErrors.push(message.params.exceptionDetails.text);
  };
  await cdp("Page.enable"); await cdp("Runtime.enable"); await cdp("Network.enable");
  const registered = await fetch(`${base}/api/auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Test", firstName: "Sarah", phone: "+216 12345678", email, password: "test-password123", confirmPassword: "test-password123", acceptTerms: true, role: "RECRUTEUR", recruiterType: "INDIVIDUAL" }) });
  assert.equal(registered.status, 201);
  const cookie = registered.headers.get("set-cookie").split(";")[0];
  await cdp("Network.setCookie", { name: cookie.slice(0, cookie.indexOf("=")), value: cookie.slice(cookie.indexOf("=") + 1), url: base, httpOnly: true });
  await mkdir(".artifacts", { recursive: true });
  for (const [width, height, name] of [[1440, 1080, "desktop"], [900, 1000, "tablet"], [390, 844, "mobile"]]) {
    await cdp("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 760 });
    await go("/recruteur/dashboard");
    assert.equal(await evaluate("document.querySelectorAll('.rq-stat').length"), 4);
    assert.equal(await evaluate("document.querySelector('h1').textContent"), "Bonjour, Sarah 👋");
    assert.ok(await evaluate("document.documentElement.scrollWidth <= innerWidth"), `${name}: horizontal overflow`);
    assert.equal(await evaluate("document.querySelectorAll('.rq-nav-link[aria-current=page]').length"), 1);
    assert.equal(await evaluate("getComputedStyle(document.querySelector('.rq-app')).colorScheme"), "light");
    await screenshot(`recruiter-${name}.png`);
    if (width < 760) {
      await evaluate("document.querySelector('.rq-menu').click()");
      assert.equal(await evaluate("document.querySelector('.rq-menu').getAttribute('aria-expanded')"), "true");
      await until("document.querySelector('.rq-sidebar').getBoundingClientRect().left >= 0");
      await evaluate("document.querySelector('a[href=\"/recruteur/messages\"]').click()");
      await until("location.pathname === '/recruteur/messages' && document.querySelector('h1')?.textContent === 'Messages'");
      assert.equal(await evaluate("document.querySelector('.rq-sidebar').classList.contains('is-open')"), false);
    }
  }
  await cdp("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1080, deviceScaleFactor: 1, mobile: false });
  await go("/recruteur/missions/nouvelle");
  await evaluate(`(() => { const values = {title:'Mission navigateur',description:'Accueil et organisation de la salle de réception.',category:'Événementiel',city:'Tunis',address:'10 avenue de la Liberté',date:'2030-12-15',startTime:'09:00',endTime:'17:00',pay:'90',capacity:'2',skills:'Accueil',experience:''}; for(const [name,value] of Object.entries(values)) document.querySelector('form [name='+name+']').value=value; document.querySelector('button[value=PUBLISHED]').click(); })()`);
  await until("/^\\/recruteur\\/missions\\/\\d+$/.test(location.pathname) && document.querySelector('h1')?.textContent === 'Mission navigateur'");
  assert.ok(await db.mission.findFirst({ where: { recruiter: { email }, title: "Mission navigateur" } }));
  // Verify the cancellation dialog, keyboard focus, and persisted result.
  await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent === 'Annuler').click()");
  await until("!!document.querySelector('[role=dialog]')");
  assert.equal(await evaluate("document.activeElement.getAttribute('role')"), "dialog");
  await evaluate("[...document.querySelectorAll('[role=dialog] button')].find(b=>b.textContent === 'Confirmer').click()");
  await until("document.querySelector('.rq-status-cancelled')?.textContent.includes('Annulée')");
  assert.equal((await db.mission.findFirst({ where: { recruiter: { email } } })).status, "CANCELLED");
  await go("/recruteur/profil");
  await evaluate("document.querySelector('form [name=sector]').value='Événementiel'; document.querySelector('form button[type=submit],form .rq-form-actions button').click()");
  await until("!!document.querySelector('.rq-success')");
  assert.equal((await db.user.findUnique({ where: { email } })).sector, "Événementiel");
  assert.deepEqual(runtimeErrors, []);
  console.log("Browser QA passed: desktop/tablet/mobile, real navigation, mission publication, confirmation dialog, cancellation and profile persistence. Screenshots: .artifacts/recruiter-*.png");
} finally {
  socket?.close();
  browser.kill();
  // Chromium descendants can retain the inherited stderr pipe on Windows.
  browser.stderr.destroy();
  browser.unref();
  const user = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (user) { await db.mission.deleteMany({ where: { recruiterId: user.id } }); await db.user.delete({ where: { id: user.id } }); }
  await db.$disconnect();
  await delay(500);
  const resolved = path.resolve(directory);
  assert.equal(path.dirname(resolved), path.resolve(tmpdir()));
  assert.ok(path.basename(resolved).startsWith("quickjob-browser-"));
  await rm(resolved, { recursive: true, force: true }).catch(() => {});
}
