import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import env from "@next/env";
import { openWorkerBrowser } from "./worker-browser-session.mjs";
env.loadEnvConfig(process.cwd());
const db = new PrismaClient(), base = process.env.TEST_BASE_URL || "http://localhost:3100", prefix = `communication-${Date.now()}-`, users = [];
let checks = 0, browser;
const check = (v, label) => { assert.ok(v, label); checks++; };
async function call(path, code, actor, method = "GET", body) {
  const response = await fetch(base + path, { method, redirect: "manual", headers: { ...(actor ? { Cookie: actor.cookie } : {}), "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.clone().text();
  check(response.status === code, `${method} ${path}: ${response.status}, expected ${code}: ${text.slice(0, 250)}`);
  if (response.headers.get("content-type")?.includes("application/json")) check(!/"(?:password|sessions|token)"\s*:/.test(text), "No secrets");
  return response;
}
async function multipart(path, code, actor, entries) {
  const data = new FormData();
  for (const [key, value] of entries) data.append(key, value);
  const response = await fetch(base + path, { method: "POST", redirect: "manual", headers: { Cookie: actor.cookie }, body: data });
  const text = await response.clone().text();
  check(response.status === code, `POST multipart ${path}: ${response.status}, expected ${code}: ${text.slice(0, 250)}`);
  return response;
}
async function account(label, role, approved = true) {
  const response = await call("/api/auth/register", 201, null, "POST", { name: "Recette", firstName: label, email: `${prefix}${label}@example.invalid`, phone: "+216 12345678", password: "test-password123", confirmPassword: "test-password123", acceptTerms: true, role, ...(role === "RECRUTEUR" ? { recruiterType: "INDIVIDUAL" } : {}) });
  const actor = { ...await response.json(), cookie: response.headers.get("set-cookie").split(";")[0] }; users.push(actor);
  if (role === "RECRUTEUR" && approved) await db.recruiterVerification.update({ where: { userId: actor.id }, data: { status: "APPROUVE" } });
  return actor;
}
const mission = { title: `${prefix}Accueil`, description: "Accueil des visiteurs pendant une journée.", category: "Services", city: "Tunis", address: "10 rue des Fleurs", date: "2037-12-15", startTime: "09:00", endTime: "12:00", pay: 90, capacity: 2, skills: "Accueil", status: "PUBLISHED" };
const create = async (actor, extra = {}) => (await call("/api/missions", 201, actor, "POST", { ...mission, ...extra })).json();
const apply = async (actor, m) => (await call(`/api/missions/${m.id}/applications`, 201, actor, "POST", {})).json();
const accept = (actor, app) => call(`/api/applications/${app.id}`, 200, actor, "PATCH", { status: "ACCEPTED" });
const messages = app => `/api/applications/${app.id}/messages`;
const reviews = app => `/api/applications/${app.id}/reviews`;
const review = { rating: 5, comment: "Mission bien organisée" };
async function finish(actor, m) {
  await call(`/api/missions/${m.id}`, 200, actor, "PATCH", { status: "CLOSED" });
  await call(`/api/missions/${m.id}`, 200, actor, "PATCH", { status: "COMPLETED" });
}
try {
  const r = await account("Recruiter", "RECRUTEUR"), other = await account("OtherRecruiter", "RECRUTEUR"), pending = await account("Pending", "RECRUTEUR", false), a = await account("Amira", "TRAVAILLEUR"), b = await account("Sami", "TRAVAILLEUR"), outsider = await account("Lina", "TRAVAILLEUR");
  check((await (await call("/api/notifications", 200, outsider)).json()).length === 0, "Empty notifications");
  const m = await create(r), app = await apply(a, m), rejected = await apply(b, m);
  await call(messages(app), 403, a); await call(messages(app), 403, r, "POST", { body: "Pas encore autorisé" });
  await call(reviews(app), 403, a, "POST", review);
  await accept(r, app);
  const n = await call("/api/notifications", 200, a), acceptance = (await n.json())[0];
  check(acceptance.message.includes("acceptée") && acceptance.readAt === null && n.headers.get("X-Unread-Count") === "1", "Acceptance notification unread");
  await call("/api/notifications", 404, b, "PATCH", { id: acceptance.id });
  await call("/api/notifications", 200, a, "PATCH", { id: acceptance.id });
  check((await db.notification.findUniqueOrThrow({ where: { id: acceptance.id } })).readAt !== null, "Read state persists");
  check((await call("/api/notifications", 200, a)).headers.get("X-Unread-Count") === "0", "Unread counter updates");
  await call("/api/notifications", 400, a, "PATCH", { id: acceptance.id, all: true });
  await call("/api/notifications", 401, null, "PATCH", { all: true });
  await call(`/api/applications/${rejected.id}`, 200, r, "PATCH", { status: "REJECTED" });
  check((await (await call("/api/notifications", 200, b)).json()).some(n => n.message.includes("refusée")), "Refusal notified");
  await call(`/api/missions/${m.id}`, 200, r, "PATCH", { title: `${prefix}Modifiée` });
  check((await (await call("/api/notifications", 200, a)).json()).some(n => n.message.includes("modifiée")), "Mission edits notified");
  const count = await db.notification.count({ where: { userId: a.id } });
  await call(`/api/missions/${m.id}`, 200, r, "PATCH", { title: `${prefix}Modifiée` });
  check(await db.notification.count({ where: { userId: a.id } }) === count, "No notification for unchanged mission");
  check((await (await call(messages(app), 200, a)).json()).messages.length === 0, "Empty conversation");
  for (const [actor, code] of [[null, 401], [other, 404], [b, 404], [pending, 403]]) {
    await call(messages(app), code, actor); await call(messages(app), code, actor, "POST", { body: "Interdit" });
    await call(reviews(app), code, actor, "POST", review);
  }
  for (const bad of [{ body: " " }, { body: "x".repeat(4001) }, { body: "Bonjour", senderId: r.id }]) await call(messages(app), 400, a, "POST", bad);
  const first = await (await call(messages(app), 201, a, "POST", { body: "Bonjour, où se trouve le lieu ?" })).json();
  check(first.senderId === a.id && first.readAt === null, "Sender derived from session");
  await call(messages(app), 200, r, "PATCH", { ids: [first.id] });
  check((await db.message.findUniqueOrThrow({ where: { id: first.id } })).readAt !== null, "Message read receipt stored");
  const second = await (await call(messages(app), 201, r, "POST", { body: "Rendez-vous à l’accueil." })).json();
  await call(messages(app), 200, r, "PATCH", { ids: [second.id] });
  check((await db.message.findUniqueOrThrow({ where: { id: second.id } })).readAt === null, "Sender cannot mark own message as read");
  await call(messages(app), 404, outsider, "PATCH", { ids: [second.id] });
  const history = (await (await call(messages(app), 200, a)).json()).messages;
  check(history.length === 2 && history[0].id === first.id && history[1].id === second.id, "Chronological persistent history");
  await call(messages(app), 200, a, "PATCH", { ids: [second.id] });
  await multipart(messages(app), 415, a, [["files", new File(["interdit"], "script.txt", { type: "text/plain" })]]);
  const rich = await (await multipart(messages(app), 201, a, [["body", "Photo et lien https://quickjob.tn"], ["files", new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], "preuve.png", { type: "image/png" })]])).json();
  check(rich.attachments.length === 1 && rich.attachments[0].kind === "IMAGE" && !JSON.stringify(rich).includes("storageKey"), "Rich image message stored without exposing storage path");
  const asset = `/api/messages/${rich.id}/attachments/${rich.attachments[0].id}`;
  check((await fetch(base + asset, { headers: { Cookie: a.cookie } })).status === 200, "Participant can open a private attachment");
  check((await fetch(base + asset, { headers: { Cookie: outsider.cookie } })).status === 404, "Non-participant cannot open a private attachment");
  const place = await (await multipart(messages(app), 201, r, [["share", JSON.stringify({ kind: "LOCATION", latitude: 36.8065, longitude: 10.1815 })]])).json();
  check(place.attachments[0].kind === "LOCATION" && place.attachments[0].latitude === 36.8065, "Geographic location message stored");
  const contact = await (await multipart(messages(app), 201, r, [["share", JSON.stringify({ kind: "CONTACT", contactName: "Accueil QuickJob", contactPhone: "+216 12 345 678" })]])).json();
  check(contact.attachments[0].kind === "CONTACT" && contact.attachments[0].contactPhone.includes("216"), "Contact message stored");
  await call(reviews(app), 409, a, "POST", review);
  await finish(r, m);
  await call(reviews(app), 409, a, "POST", review); // Status alone cannot bypass the actual scheduled end.
  // Advance the test fixture's schedule to simulate the passage of time, without changing production clocks.
  await db.mission.update({ where: { id: m.id }, data: { date: new Date("2020-01-15T00:00:00Z") } });
  for (const bad of [{ rating: 0 }, { rating: 6 }, { rating: 2.5 }, { comment: " " }, { recipientId: other.id }]) await call(reviews(app), 400, a, "POST", { ...review, ...bad });
  const race = await Promise.all([1, 2].map(() => fetch(base + reviews(app), { method: "POST", headers: { Cookie: a.cookie, "Content-Type": "application/json" }, body: JSON.stringify(review) })));
  check(race.filter(r => r.status === 201).length === 1 && race.filter(r => r.status === 409).length === 1, "Concurrent duplicate reviews blocked");
  await call(reviews(app), 201, r, "POST", { rating: 4, comment: "Travail sérieux" });
  await call(reviews(app), 409, r, "POST", { rating: 4, comment: "Doublon" });
  const summary = await (await call(reviews(app), 200, a)).json();
  check(summary.average === 5 && summary.count === 1 && summary.reviews.length === 2 && !summary.canReview, "Reciprocal reviews and recorded average");
  await call(reviews(rejected), 403, b, "POST", review);
  const cancelledMission = await create(r, { title: `${prefix}Annulation`, date: "2037-12-16" });
  const cancelApp = await apply(a, cancelledMission); await accept(r, cancelApp);
  await call(`/api/missions/${cancelledMission.id}`, 200, r, "PATCH", { status: "CANCELLED" });
  check((await (await call("/api/notifications", 200, a)).json()).some(n => n.message.includes("annulée")), "Cancellation notification");
  await call(reviews(cancelApp), 409, a, "POST", review);
  const next = await create(r, { title: `${prefix}Deuxième mission`, date: "2037-12-17" }), nextApp = await apply(a, next); await accept(r, nextApp);
  await finish(r, next); await db.mission.update({ where: { id: next.id }, data: { date: new Date("2020-01-16T00:00:00Z") } });
  if (process.env.TEST_BROWSER !== "0") {
    browser = await openWorkerBrowser(base);
    await browser.cookie(outsider.cookie); await browser.go("/dashboard/travailleur/messages");
    check(await browser.evaluate("document.body.textContent.includes('Aucune conversation')"), "Empty messages UI");
    await browser.go("/dashboard/travailleur/notifications");
    check(await browser.evaluate("document.body.textContent.includes('Aucune notification')"), "Empty notifications UI");
    await browser.cookie(a.cookie); await browser.go(`/dashboard/travailleur/messages?application=${app.id}`);
    check(await browser.evaluate("document.body.textContent.includes('Rendez-vous à l’accueil.')"), "Reloaded message history UI");
    check(await browser.evaluate("!!document.querySelector('.qj-conversation-search') && !!document.querySelector('.qj-conversation-list a[aria-current=page]') && ![...document.querySelectorAll('button')].some(button=>button.textContent.includes('Actualiser les messages'))"), "Premium conversation list, active thread and automatic refresh UI");
    await browser.evaluate("document.querySelector('.qj-message-form textarea').focus()");
    await browser.cdp("Input.insertText", { text: "Ligne 1" });
    await browser.cdp("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", text: "\r", modifiers: 8, windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
    await browser.cdp("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", modifiers: 8, windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
    await browser.cdp("Input.insertText", { text: "Ligne 2" });
    check(await browser.evaluate("document.querySelector('.qj-message-form textarea').value.includes('\\n') && !document.querySelector('.qj-message-history').textContent.includes('Ligne 2')"), "Shift+Enter inserts a line break without sending");
    await browser.evaluate("document.querySelector('.qj-message-form textarea').value=''; document.querySelector('.qj-message-form textarea').focus()");
    await browser.cdp("Input.insertText", { text: "Message navigateur" });
    await browser.cdp("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
    await browser.cdp("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
    await browser.until("document.querySelector('.qj-message-history').textContent.includes('Message navigateur')");
    check(true, "Enter sends the message without a search or refresh button");
    await browser.evaluate("window.__quickjobMessengerMarker='preserved'");
    await call(messages(app), 201, r, "POST", { body: "Synchronisation automatique" });
    await browser.until("document.querySelector('.qj-message-history').textContent.includes('Synchronisation automatique')");
    check(await browser.evaluate("window.__quickjobMessengerMarker==='preserved'"), "Incoming messages synchronize without reloading the page");
    await browser.until("document.querySelector('.qj-message-history').scrollHeight-document.querySelector('.qj-message-history').scrollTop-document.querySelector('.qj-message-history').clientHeight<100");
    check((await db.message.findFirstOrThrow({ where: { applicationId: app.id, body: "Synchronisation automatique" } })).readAt !== null, "Automatic synchronization updates unread state");
    await call(messages(nextApp), 201, r, "POST", { body: "Nouveau message non lu" });
    await browser.until(`!![...document.querySelectorAll('.qj-conversation-list a')].find(link=>link.textContent.includes(${JSON.stringify(next.title)}))?.querySelector('.qj-unread-badge')`);
    check(true, "Unread conversation badge updates automatically");
    await browser.evaluate("document.querySelector('.qj-conversation-search input').focus()");
    await browser.cdp("Input.insertText", { text: "Deuxième mission" });
    await browser.until("document.querySelectorAll('.qj-conversation-list a').length===1");
    check(true, "Conversation search filters dynamically");
    for (let attempt = 0; attempt < 20 && !(await db.user.findUniqueOrThrow({ where: { id: a.id } })).lastSeenAt; attempt++) await new Promise(resolve => setTimeout(resolve, 150));
    check(!!(await db.user.findUniqueOrThrow({ where: { id: a.id } })).lastSeenAt, "Authenticated heartbeat persists real presence");
    await browser.cookie(r.cookie); await browser.go(`/recruteur/messages?application=${app.id}`);
    check(await browser.evaluate("document.querySelector('.qj-message-history').textContent.includes('Message navigateur')"), "Recruiter receives browser message");
    check(await browser.evaluate("document.querySelector('.qj-thread-header').textContent.includes('En ligne')"), "Recent worker heartbeat is displayed as online");
    await browser.until("!document.querySelector('[role=alert]')");
    for (const width of [1440, 900, 390]) {
      await browser.cdp("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: width < 760 });
      if (width < 760) await browser.until("document.querySelector('.rq-sidebar').getBoundingClientRect().right <= 1");
      check(await browser.evaluate("document.documentElement.scrollWidth <= innerWidth"), `Responsive messages ${width}`);
      check(await browser.evaluate("(()=>{const thread=document.querySelector('.qj-thread').getBoundingClientRect(),composer=document.querySelector('.qj-composer-wrap').getBoundingClientRect(),history=document.querySelector('.qj-message-history').getBoundingClientRect();return Math.abs(thread.bottom-composer.bottom)<2&&history.bottom<=composer.top+1&&getComputedStyle(document.querySelector('.qj-message-history')).overflowY==='auto'})()"), `Composer fixed at thread bottom ${width}`);
    }
    await browser.cookie(a.cookie); await browser.go("/dashboard/travailleur/notifications");
    await browser.evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Tout marquer comme lu').click()");
    await browser.until("document.body.textContent.includes('0 notification(s) non lue(s)')");
    await browser.until("document.querySelector('.qj-bell')?.getAttribute('aria-label').includes('0 non lues')");
    check(await db.notification.count({ where: { userId: a.id, readAt: null } }) === 0, "Read-all persisted and header updated");
    check(await browser.evaluate("document.documentElement.scrollWidth <= innerWidth"), "Responsive worker notification header");
    await browser.go(`/dashboard/travailleur/candidatures/${nextApp.id}`);
    await browser.evaluate("document.querySelector('.qj-review-form [name=rating]').value='3'; document.querySelector('.qj-review-form [name=comment]').value='Bonne expérience'; document.querySelector('.qj-review-form button').click()");
    await browser.until("document.body.textContent.includes('Votre évaluation enregistrée') && !document.querySelector('.qj-review-form')");
    await browser.cookie(r.cookie); await browser.go(`/recruteur/candidatures/${nextApp.id}`);
    await browser.evaluate("document.querySelector('.qj-review-form [name=rating]').value='2'; document.querySelector('.qj-review-form [name=comment]').value='Axes de progrès'; document.querySelector('.qj-review-form button').click()");
    await browser.until("document.body.textContent.includes('Votre évaluation enregistrée') && !document.querySelector('.qj-review-form')");
    check(browser.errors.length === 0, "No browser exceptions");
  } else {
    await call(reviews(nextApp), 201, a, "POST", { rating: 3, comment: "Bonne expérience" });
    await call(reviews(nextApp), 201, r, "POST", { rating: 2, comment: "Axes de progrès" });
  }
  check((await (await call(reviews(nextApp), 200, a)).json()).average === 4, "Recruiter average computed from two stored reviews");
  check((await (await call(reviews(nextApp), 200, r)).json()).average === 3, "Worker average computed from two stored reviews");
  console.log(`${checks} contrôles communication réussis : notifications, messagerie, évaluations, permissions, doublons${browser ? ', navigateur et responsive' : ''}.`);
} finally {
  if (browser) await browser.close();
  const ids = users.map(u => u.id);
  await db.application.deleteMany({ where: { OR: [{ workerId: { in: ids } }, { mission: { recruiterId: { in: ids } } }] } });
  await db.mission.deleteMany({ where: { recruiterId: { in: ids } } });
  await db.user.deleteMany({ where: { id: { in: ids } } });
  await db.$disconnect();
}
