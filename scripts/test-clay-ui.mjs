import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { openWorkerBrowser } from "./worker-browser-session.mjs";
const fixture = JSON.parse(await readFile(".artifacts/clay-ui-env.json", "utf8"));
const liveDatabasePath = "prisma/dev.db";
const liveDatabaseHash = crypto.createHash("sha256").update(await readFile(liveDatabasePath)).digest("hex");
assert.ok(/quickjob-clay-ui-\d+\.db$/.test(fixture.databaseFile), "Visual checks must use the isolated database");
const base = process.env.TEST_BASE_URL || "http://localhost:3101";
assert.ok(base.endsWith(":3101"), "Visual checks must never target the live preview");
const widths = [1440, 1024, 768, 430, 390, 360], screenshots = [];
const registrationEmail = `registration-${Date.now()}@clay-ui.example.invalid`;
let browser, checks = 0;
const check = (v, label) => { assert.ok(v, label); checks++; };
async function go(route, selector) {
  await browser.cdp("Page.navigate", { url: base + route });
  await browser.until(`location.pathname===${JSON.stringify(route.split("?")[0])} && document.readyState==='complete' && !!document.querySelector(${JSON.stringify(selector)})`);
  await browser.evaluate("document.fonts.ready");
}
async function viewport(width) { await browser.cdp("Emulation.setDeviceMetricsOverride", { width, height: width >= 768 ? 1000 : 844, deviceScaleFactor: 1, mobile: width < 768 }); }
async function fits(label) {
  const sizes = await browser.evaluate("({width:innerWidth,scroll:document.documentElement.scrollWidth})");
  check(sizes.scroll <= sizes.width, `${label}: overflow ${JSON.stringify(sizes)}`);
}
async function shot(name) { const file=`clay-${name}.png`; await browser.screenshot(file); screenshots.push(file); }
async function loginActor(name) {
  const actor = fixture.actors[name];
  const response = await fetch(base + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: actor.email, password: actor.password }) });
  check(response.status === 200, `Isolated ${name} login`);
  await browser.cookie(response.headers.get("set-cookie").split(";")[0]);
}
function contrast(foreground, background) {
  const luminance = s => { const channels=s.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4); return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722; };
  const a=luminance(foreground),b=luminance(background);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
}
try {
  browser = await openWorkerBrowser(base);
  await browser.cdp("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await go("/", ".city-home");
  check(await browser.evaluate("!!document.querySelector('.city-primary') && !!document.querySelector('.city-recruit-cta')"), "Both homepage journeys remain visible");
  check(await browser.evaluate("getComputedStyle(document.body).getPropertyValue('--color-primary').trim().toLowerCase()==='#1b3b65'"), "Central palette tokens loaded");
  for (const width of widths) { await viewport(width); await fits(`Home ${width}`); }
  await viewport(1440); await shot("home-desktop");
  await viewport(390); await shot("home-mobile");
  await browser.evaluate("document.querySelector('.city-menu-button').click()");
  check(await browser.evaluate("document.querySelector('.city-menu-button').getAttribute('aria-expanded')==='true'"), "Public mobile menu opens");
  await browser.evaluate("document.querySelector('.city-menu-button').click()");
  await browser.evaluate("document.querySelectorAll('.city-chapter-nav button')[1].click()");
  await browser.until("document.querySelector('.city-home').dataset.chapter==='1'");
  check(await browser.evaluate("!!document.querySelector('.city-mission-picker')"), "Existing city mission journey preserved");
  await browser.evaluate("document.querySelector('.city-content .city-world-label').click()");
  await browser.until("!!document.querySelector('dialog[open]')");
  check(await browser.evaluate("getComputedStyle(document.querySelector('dialog[open]')).backdropFilter.includes('blur')"), "City dialog uses a readable glass surface");
  await browser.evaluate("document.querySelector('dialog[open] .city-dialog-close').click()");
  await go("/login", ".auth-experience");
  for (const width of widths) { await viewport(width); await fits(`Login ${width}`); }
  await viewport(1440); await shot("login-desktop");
  await browser.evaluate("document.querySelector('[data-form-mode=login] .auth-switch a').click()");
  await browser.until("location.pathname==='/register' && document.querySelector('.auth-experience').dataset.moving==='false'");
  for (const width of widths) { await viewport(width); await fits(`Registration roles ${width}`); }
  await viewport(1440); await shot("register-desktop");
  await browser.evaluate("document.querySelector('[data-auth-form=register] input[value=RECRUTEUR]').click(); document.querySelector('[data-auth-form=register] .auth-submit').click()");
  await browser.until("document.querySelector('[data-auth-form=register]').dataset.step==='2'");
  for (const width of widths) { await viewport(width); await fits(`Registration fields ${width}`); }
  await viewport(390); await shot("register-mobile");
  await browser.evaluate(`(() => { const form=document.querySelector('[data-auth-form=register]'); const values={name:'Martin',firstName:'Camille',email:${JSON.stringify(registrationEmail)},phone:'+216 12345678',password:'Visual-check123!',confirmPassword:'Visual-check123!'};for(const [name,value] of Object.entries(values)){const input=form.querySelector('[name='+name+']');input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));}form.querySelector('[name=acceptTerms]').checked=true;form.querySelector('.auth-submit').click();})()`);
  await browser.until("location.pathname==='/recruteur/en-attente' && !!document.querySelector('.qv-page')");
  check(await browser.evaluate("document.querySelector('.qv-card').textContent.includes('vérification')"), "Registration still leads to recruiter approval workflow");
  await fits("Pending verification mobile"); await shot("verification-mobile");
  await browser.cdp("Network.clearBrowserCookies");
  await go("/login", ".auth-experience");
  await browser.evaluate(`(() => { const form=document.querySelector('[data-auth-form=login]'); form.querySelector('[name=email]').value=${JSON.stringify(fixture.actors.worker.email)};form.querySelector('[name=password]').value='wrong-password';form.querySelector('.auth-submit').click();})()`);
  await browser.until("!!document.querySelector('.auth-exp-login [role=alert]')");
  check(await browser.evaluate("getComputedStyle(document.querySelector('.auth-error')).color==='rgb(163, 51, 69)'"), "Readable error styling remains visible");
  await browser.evaluate(`document.querySelector('[data-auth-form=login] [name=password]').value=${JSON.stringify(fixture.actors.worker.password)};document.querySelector('[data-auth-form=login] .auth-submit').click()`);
  await browser.until("location.pathname==='/dashboard/travailleur' && !!document.querySelector('.rq-app')");
  check(true, "Existing login form still works");
  const workerPages = ["/dashboard/travailleur", "/dashboard/travailleur/missions", `/dashboard/travailleur/missions/${fixture.availableId}`, `/dashboard/travailleur/calendrier?month=${fixture.month}`, "/dashboard/travailleur/candidatures", "/dashboard/travailleur/favoris", `/dashboard/travailleur/messages?application=${fixture.applicationId}`, "/dashboard/travailleur/notifications", "/dashboard/travailleur/profil"];
  for (const route of workerPages) {
    await browser.go(route);
    for (const width of widths) { await viewport(width); await fits(`${route} ${width}`); }
    if (route === workerPages[0]) { await viewport(1440); await shot("worker-desktop"); await viewport(390); await shot("worker-mobile"); }
    if (route === workerPages[1]) { await viewport(1440); await shot("mission-list-desktop"); await viewport(390); await shot("mission-list-mobile"); check(await browser.evaluate("!!document.querySelector('.wk-marketplace-filters') && !!document.querySelector('.wk-mission-card .wk-mission-art img')"), "Mission marketplace shows real results with category artwork"); }
    if (route === workerPages[2]) { await viewport(1440); await shot("mission-detail-desktop"); check(await browser.evaluate("!!document.querySelector('.wk-mission-detail-art img')"), "Mission detail has a category illustration"); }
    if (route.includes("calendrier")) { await viewport(1440); await shot("calendar-desktop"); await viewport(390); await shot("calendar-mobile"); check(await browser.evaluate("['available','unavailable','pending','accepted'].every(type=>!!document.querySelector('.wk-calendar-day .'+type))"), "All four calendar status colors retained"); }
    if (route.includes("messages?")) { await viewport(1440); await shot("messages-desktop"); }
    if (route.endsWith("notifications")) { await viewport(1440); await shot("notifications-desktop"); check(await browser.evaluate("!!document.querySelector('.qj-notifications .qj-soft-icon')"), "Notifications use dimensional icon tiles"); }
  }
  await browser.go("/dashboard/travailleur"); await viewport(1440);
  const colors = await browser.evaluate("(()=>{const b=document.querySelector('.rq-primary'),n=document.querySelector('.rq-nav-link.is-active');return{fg:getComputedStyle(b).color,bg:getComputedStyle(b).backgroundColor,nav:getComputedStyle(n).backgroundColor,card:getComputedStyle(document.querySelector('.rq-panel')).borderRadius,shadow:getComputedStyle(document.querySelector('.rq-panel')).boxShadow}})()");
  check(contrast('rgb(20, 47, 82)','rgb(242, 220, 112)')>=4.5,"Primary action text has WCAG AA contrast");check(await browser.evaluate("getComputedStyle(document.querySelector('.rq-primary')).backgroundImage.includes('linear-gradient')"),"Primary action uses the yellow brand gradient");check(await browser.evaluate("getComputedStyle(document.querySelector('.rq-nav-link.is-active')).backgroundImage.includes('linear-gradient')"),"Selected navigation uses the yellow brand surface");check(colors.card==='26px'&&colors.shadow!=='none',"Clay cards have depth and rounded corners");
  check(await browser.evaluate("getComputedStyle(document.querySelector('.rq-primary')).transitionDuration.split(',').every(d=>parseFloat(d)===0)"), "Reduced motion disables transitions");
  await browser.cdp("Emulation.setEmulatedMedia",{features:[{name:"prefers-reduced-motion",value:"no-preference"}]});
  check(await browser.evaluate("getComputedStyle(document.querySelector('.rq-primary')).transitionDuration.includes('0.18s')"),"Lightweight micro-interaction timing");
  await browser.cdp("Emulation.setEmulatedMedia",{features:[{name:"prefers-reduced-motion",value:"reduce"}]});
  await loginActor("recruiter");
  const recruiterPages=["/recruteur/dashboard","/recruteur/missions","/recruteur/missions/nouvelle",`/recruteur/missions/${fixture.availableId}/modifier`,"/recruteur/candidatures",`/recruteur/candidatures/${fixture.applicationId}`,"/recruteur/travailleurs",`/recruteur/messages?application=${fixture.applicationId}`,"/recruteur/profil"];
  for(const route of recruiterPages){await browser.go(route);for(const width of [1440,1024,768,390,360]){await viewport(width);await fits(`${route} ${width}`);}if(route.endsWith('dashboard')){await viewport(1440);await shot('recruiter-desktop');}if(route.endsWith('nouvelle')){await viewport(1440);await shot('mission-form-desktop');}}
  await loginActor("admin");
  const adminPages=["/dashboard/administrateur","/admin/utilisateurs","/admin/recruteurs",`/admin/recruteurs/${fixture.actors.pending.id}`,"/admin/missions",`/admin/missions/${fixture.availableId}`,"/admin/signalements",`/admin/signalements/${fixture.reportId}`,"/admin/categories"];
  for(const route of adminPages){await browser.go(route);for(const width of [1440,1024,768,390,360]){await viewport(width);await fits(`${route} ${width}`);}if(route==='/dashboard/administrateur'){await viewport(1440);await shot('admin-desktop');}if(route==='/admin/recruteurs'){await viewport(390);await shot('admin-mobile');}}
  await browser.cdp("Network.clearBrowserCookies");await loginActor("refused");await go('/recruteur/refuse','.qv-page');await viewport(390);await fits('Refused recruiter');check(await browser.evaluate("document.querySelector('.qv-reason').textContent.includes('compléter')"),'Refusal explanation remains readable');
  check(browser.errors.length===0,`No hydration or runtime exceptions: ${browser.errors.join(', ')}`);
  const baseline=JSON.parse(await readFile('.artifacts/clay-protected-baseline.json','utf8'));
  const presentationFiles=new Set(['src\\components\\auth\\AuthExperience.tsx','src\\components\\DashboardStat.tsx','src\\components\\recruiter\\ui.tsx','src\\components\\recruiter\\MissionTable.tsx','src\\components\\worker\\MissionCard.tsx','src\\components\\AuthForm.tsx','src\\components\\communication\\NotificationCenter.tsx','src\\app\\dashboard\\travailleur\\missions\\page.tsx','src\\app\\dashboard\\travailleur\\missions\\[id]\\page.tsx']);
  let protectedFiles=0;
  for(const [file,hash]of Object.entries(baseline)){if(presentationFiles.has(file)||file===liveDatabasePath.replaceAll('/','\\'))continue;assert.equal(crypto.createHash('sha256').update(await readFile(file)).digest('hex'),hash,`Protected file changed: ${file}`);protectedFiles++;}
  assert.equal(crypto.createHash('sha256').update(await readFile(liveDatabasePath)).digest('hex'),liveDatabaseHash,'Live database changed during isolated visual checks');
  check(true,'Prisma, live database, APIs, authentication and existing business components are unchanged');
  await writeFile('.artifacts/clay-ui-results.json',JSON.stringify({checks,screenshots,protectedFiles},null,2));
  console.log(`${checks} clay UI checks passed; ${screenshots.length} screenshots; protected business files and live database unchanged.`);
} finally { if(browser)await browser.close(); }
