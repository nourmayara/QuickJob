import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import nextEnv from "@next/env";
import { openWorkerBrowser } from "./worker-browser-session.mjs";
nextEnv.loadEnvConfig(process.cwd());
const db = new PrismaClient(), base = process.env.TEST_BASE_URL || "http://localhost:3100";
const prefix = `auth-transition-${Date.now()}-`, password = "Auth-transition123!";
let browser, checks = 0;
function check(condition, message) { assert.ok(condition, message); checks++; }
async function evaluate(expression) { return browser.evaluate(expression); }
async function navigate(mode) {
  await browser.cdp("Page.navigate", { url: `${base}/${mode}` });
  await browser.until(`location.pathname === '/${mode}' && document.readyState === 'complete' && document.querySelector('.auth-experience')?.dataset.mode === '${mode}'`);
  await browser.until("document.querySelector('.auth-experience')?.dataset.moving === 'false'");
}
async function settled(mode) {
  await browser.until(`location.pathname === '/${mode}' && document.querySelector('.auth-experience')?.dataset.mode === '${mode}' && document.querySelector('.auth-experience')?.dataset.moving === 'false'`);
}
async function switchMode(mode) {
  await evaluate(`document.querySelector('[data-form-mode="${mode === "login" ? "register" : "login"}"] .auth-switch a').click()`);
  await settled(mode);
}
async function fill(mode, values) {
  await evaluate(`(() => { const form=document.querySelector('[data-auth-form="${mode}"]'); for(const [name,value] of Object.entries(${JSON.stringify(values)})) { const input=form.querySelector('[name="'+name+'"]'); input.value=value; input.dispatchEvent(new Event('input',{bubbles:true})); input.dispatchEvent(new Event('change',{bubbles:true})); } })()`);
}
async function submit(mode) { await evaluate(`document.querySelector('[data-auth-form="${mode}"] .auth-submit').click()`); }
async function changeRole(role) {
  await evaluate(`document.querySelector('[data-auth-form="register"] .auth-back')?.click(); document.querySelector('[data-auth-form="register"] input[value="${role}"]').click()`);
  await submit("register");
  await browser.until("!document.querySelector('[data-auth-form=register] .auth-inputs').hidden");
}
async function desktopLayouts(mode, stage) {
  for (const [width, height] of [[1920, 1080], [1920, 873], [1440, 900], [1366, 801], [1366, 768], [1280, 720], [1280, 640], [1280, 625], [1024, 768], [900, 720], [900, 640], [900, 625]]) {
    await browser.cdp("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
    const layout = await evaluate(`(async () => {
      await document.fonts.ready;
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const side = document.querySelector('[data-form-mode="${mode}"]');
      const body = side.querySelector('.auth-exp-body');
      const content = side.querySelector('.auth-content').getBoundingClientRect();
      const header = side.querySelector('.auth-header').getBoundingClientRect();
      const footer = side.querySelector('.auth-footer').getBoundingClientRect();
      const clipped = [...side.querySelectorAll('input, select, button, .auth-role')]
        .filter(element => !element.closest('[hidden]') && element.getClientRects().length && element.type !== 'radio')
        .filter(element => { const r = element.getBoundingClientRect(); return r.top < 0 || r.bottom > innerHeight + 1 || r.left < 0 || r.right > innerWidth + 1; })
        .map(element => element.name || element.className);
      return { rootHeight: document.documentElement.scrollHeight, rootWidth: document.documentElement.scrollWidth,
        viewportHeight: innerHeight, viewportWidth: innerWidth, scrollY,
        bodyHeight: body.clientHeight, bodyScrollHeight: body.scrollHeight,
        contentTop: content.top, contentBottom: content.bottom, headerBottom: header.bottom, footerTop: footer.top, footerBottom: footer.bottom, clipped };
    })()`);
    const context = `${stage} ${width}×${height}: ${JSON.stringify(layout)}`;
    check(layout.rootHeight <= height + 1 && layout.rootWidth <= width && layout.scrollY === 0, `No page scrolling — ${context}`);
    check(layout.bodyScrollHeight <= layout.bodyHeight + 1, `No internal overflow or clipped content — ${context}`);
    check(layout.contentTop >= layout.headerBottom && layout.contentBottom <= layout.footerTop && layout.footerBottom <= height, `All content fits between header and footer — ${context}`);
    check(layout.clipped.length === 0, `Every control stays visible — ${context}`);
    if (width === 1280 && (height === 720 || height === 625)) await browser.screenshot(`auth-${stage}-${width}x${height}.png`);
  }
  await browser.cdp("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
}
async function instrumentRequests() {
  await evaluate(`(() => { window.__authCalls=[]; window.__holdAuth=false; const original=window.fetch.bind(window); window.fetch=async (...args)=>{const url=String(args[0]); if(/^\\/api\\/auth\\/(login|register)$/.test(url)){window.__authCalls.push(url); if(window.__holdAuth) await new Promise(resolve=>window.__releaseAuth=resolve);} return original(...args);}; })()`);
}
async function logout() {
  check(await evaluate("fetch('/api/auth/logout',{method:'POST'}).then(r=>r.ok)"), "Logout failed");
}
async function register(modeRole, email, hold = false) {
  await navigate("register"); await instrumentRequests();
  if (modeRole === "RECRUTEUR") await evaluate("document.querySelector('[data-auth-form=register] input[value=RECRUTEUR]').click()");
  await submit("register");
  await browser.until("!document.querySelector('[data-auth-form=register] .auth-inputs').hidden");
  await fill("register", { name: "Recette", firstName: "Amira", phone: "+216 12345678", email, password, confirmPassword: password, ...(modeRole === "TRAVAILLEUR" ? { city: "Tunis" } : {}) });
  await evaluate("document.querySelector('[data-auth-form=register] input[name=acceptTerms]').click()");
  if (hold) await evaluate("window.__holdAuth=true");
  await submit("register");
  if (hold) {
    await browser.until("document.querySelector('[data-auth-form=register]').getAttribute('aria-busy') === 'true'");
    check(await evaluate("document.querySelector('[data-form-mode=register] .auth-switch a').getAttribute('aria-disabled') === 'true'"), "Mode switch must be disabled during submission");
    await evaluate("document.querySelector('[data-form-mode=register] .auth-switch a').click()");
    check(await evaluate("location.pathname === '/register'"), "Submission must prevent mode navigation");
    await evaluate("window.__holdAuth=false; window.__releaseAuth()");
  }
  const destination = modeRole === "RECRUTEUR" ? "/recruteur/dashboard" : "/dashboard/travailleur";
  await browser.until(`location.pathname === '${destination}' && !!document.querySelector('.rq-app')`);
  check(await evaluate("window.__authCalls.filter(url=>url==='/api/auth/register').length === 1"), "One registration request per submission");
  const user = await db.user.findUniqueOrThrow({ where: { email } });
  check(user.role === modeRole, "Registered role must match the public choice");
  check(user.password !== password, "Stored password must remain hashed");
}
async function login(email, destination) {
  await navigate("login"); await instrumentRequests();
  await fill("login", { email, password }); await submit("login");
  await browser.until(`location.pathname === '${destination}'`);
  check(await evaluate("window.__authCalls.filter(url=>url==='/api/auth/login').length === 1"), "One login request per submission");
}
try {
  browser = await openWorkerBrowser(base);
  await browser.cdp("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await navigate("login");
  await evaluate("window.__authMarker='stable-document';window.__authTimeOrigin=performance.timeOrigin");
  const start = await evaluate("document.querySelector('.auth-exp-presentation').getBoundingClientRect().left");
  const height = await evaluate("document.querySelector('.auth-experience').getBoundingClientRect().height");
  check(Math.abs(start - 720) < 2, "Login presentation must start on the right");
  check(await evaluate("document.querySelector('.auth-exp-login .quickjob-logo').getBoundingClientRect().height >= 40 && document.querySelector('.auth-exp-login .quickjob-logo').getBoundingClientRect().height <= 48"), "Compact original logo");
  await fill("login", { email: "preserved@example.invalid", password: "preserved-password" });
  await browser.screenshot("auth-login-desktop.png");
  await desktopLayouts("login", "login");
  await evaluate("document.querySelector('[data-form-mode=login] .auth-switch a').click()");
  await browser.until("document.querySelector('.auth-experience').dataset.mode === 'register'");
  const midpoint = await evaluate("(async()=>{await new Promise(r=>setTimeout(r,300));return document.querySelector('.auth-exp-presentation').getBoundingClientRect().left})()");
  check(midpoint > 2 && midpoint < start - 2, "Presentation must physically slide across the screen");
  await browser.screenshot("auth-transition-midpoint.png");
  await settled("register");
  check(await evaluate("Math.abs(document.querySelector('.auth-exp-presentation').getBoundingClientRect().left) < 2"), "Register presentation must finish on the left");
  check(await evaluate(`document.querySelector('.auth-experience').getBoundingClientRect().height === ${height}`), "Mode transition must preserve desktop height");
  check(await evaluate("document.activeElement.id === 'auth-register-title'"), "Focus must reach the new heading");
  check(await evaluate("document.querySelector('.auth-exp-login').inert && document.querySelector('[data-auth-form=login] input[name=email]').matches(':disabled')"), "Hidden login must be inert and disabled");
  check(await evaluate("document.querySelectorAll('[data-auth-form=login]').length===1 && document.querySelectorAll('[data-auth-form=register]').length===1"), "Each form is mounted once");
  check(await evaluate("new Set([...document.querySelectorAll('[id]')].map(e=>e.id)).size === document.querySelectorAll('[id]').length"), "Input identifiers must be unique");
  check(await evaluate("document.querySelectorAll('input[name=roleChoice]').length === 2 && !document.querySelector('input[value=ADMIN]')"), "Public registration must never expose ADMIN");
  await browser.screenshot("auth-register-desktop.png");
  await desktopLayouts("register", "register-role");
  await changeRole("RECRUTEUR");
  await evaluate("const select=document.querySelector('[name=recruiterType]');select.value='COMPANY';select.dispatchEvent(new Event('change',{bubbles:true}))");
  await browser.until("!document.querySelector('[name=companyName]').disabled");
  await fill("register", { name: "Conservé", firstName: "Amira", companyName: "Entreprise conservée", email: "draft@example.invalid", phone: "+216 12345678", password, confirmPassword: "different-password" });
  await evaluate("document.querySelector('[name=acceptTerms]').click()");
  await submit("register");
  await browser.until("document.querySelector('[data-auth-form=register] .auth-error')?.textContent.includes('correspondent')");
  await desktopLayouts("register", "register-company-error");
  await changeRole("TRAVAILLEUR"); await fill("register", { city: "Tunis" });
  await desktopLayouts("register", "register-worker");
  await changeRole("RECRUTEUR");
  check(await evaluate("document.querySelector('[name=companyName]').value === 'Entreprise conservée'"), "Company must survive role changes");
  await changeRole("TRAVAILLEUR");
  check(await evaluate("document.querySelector('[data-auth-form=register] [name=city]').value === 'Tunis'"), "City must survive role changes");
  await switchMode("login");
  check(await evaluate("document.querySelector('[data-auth-form=login] [name=email]').value === 'preserved@example.invalid'"), "Login fields must survive mode changes");
  await switchMode("register");
  check(await evaluate("document.querySelector('[data-auth-form=register] [name=name]').value === 'Conservé' && !document.querySelector('[data-auth-form=register] .auth-inputs').hidden"), "Registration fields and step must survive mode changes");
  await evaluate("history.back()"); await settled("login");
  await evaluate("history.forward()"); await settled("register");
  check(await evaluate("window.__authMarker === 'stable-document' && window.__authTimeOrigin === performance.timeOrigin"), "Navigation and history must never reload the document");
  // Reverse an in-progress transition; CSS must continue from its current position.
  await evaluate("document.querySelector('[data-form-mode=register] .auth-switch a').click()");
  await browser.until("location.pathname === '/login'");
  await evaluate("document.querySelector('[data-form-mode=login] .auth-switch a').click()");
  await settled("register");
  check(await evaluate("Math.abs(document.querySelector('.auth-exp-presentation').getBoundingClientRect().left) < 2"), "Repeated toggles must settle correctly");
  for (const [width, h, name] of [[900, 1000, "tablet"], [390, 844, "mobile"]]) {
    await browser.cdp("Emulation.setDeviceMetricsOverride", { width, height: h, deviceScaleFactor: 1, mobile: width < 850 });
    check(await evaluate("document.documentElement.scrollWidth <= innerWidth"), `${name}: no horizontal overflow`);
    check(await evaluate("document.querySelector('[data-auth-form=register] input[name=email]').getBoundingClientRect().width > 100"), `${name}: form must remain accessible`);
    await browser.screenshot(`auth-register-${name}.png`);
  }
  await evaluate("document.querySelector('[data-auth-form=register] .auth-back').focus(); document.querySelector('[data-auth-form=register] .auth-back').click()");
  await browser.until("document.activeElement.matches('.auth-step-title') && document.activeElement.getBoundingClientRect().top >= 0 && document.activeElement.getBoundingClientRect().bottom <= innerHeight");
  check(await evaluate("!document.querySelector('[data-auth-form=register] .auth-role-group').hidden"), "Mobile role step remains visible after returning from the bottom of the form");
  await evaluate("document.querySelector('[data-auth-form=register] .auth-submit').focus(); document.querySelector('[data-auth-form=register] .auth-submit').click()");
  await browser.until("document.activeElement.matches('.auth-step-title') && document.activeElement.getBoundingClientRect().top >= 0 && document.activeElement.getBoundingClientRect().bottom <= innerHeight");
  check(await evaluate("!document.querySelector('[data-auth-form=register] .auth-inputs').hidden"), "Mobile information step scrolls its heading into view");
  await browser.cdp("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await switchMode("login");
  check(await evaluate("getComputedStyle(document.querySelector('.auth-exp-presentation')).transitionDuration === '0s'"), "Reduced motion must remove animation");
  await browser.screenshot("auth-login-mobile.png");
  await browser.cdp("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  await browser.cdp("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  check(await evaluate("!document.activeElement.closest('[inert]')"), "Keyboard must never focus the hidden form");
  await navigate("register");
  check(await evaluate("document.querySelector('.auth-experience').dataset.mode === 'register'"), "Direct and refreshed register URL");
  await browser.cdp("Page.reload");
  await browser.until("document.readyState === 'complete' && document.querySelector('.auth-experience')?.dataset.mode === 'register'");
  check(await evaluate("location.pathname === '/register'"), "Reload must preserve URL mode");
  await browser.cdp("Emulation.setEmulatedMedia", { features: [] });
  await browser.cdp("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  const workerEmail = `${prefix}worker@example.invalid`, recruiterEmail = `${prefix}recruiter@example.invalid`, adminEmail = `${prefix}admin@example.invalid`;
  await register("TRAVAILLEUR", workerEmail, true); await logout();
  await register("RECRUTEUR", recruiterEmail); await logout();
  await login(workerEmail, "/dashboard/travailleur"); await logout();
  await login(recruiterEmail, "/recruteur/dashboard"); await logout();
  const adminResponse = await fetch(`${base}/api/auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Recette", firstName: "Admin", phone: "+216 12345678", email: adminEmail, password, confirmPassword: password, acceptTerms: true, role: "TRAVAILLEUR" }) });
  check(adminResponse.status === 201, "Create isolated admin test account as a worker");
  await db.user.update({ where: { email: adminEmail }, data: { role: "ADMIN" } });
  await login(adminEmail, "/dashboard/administrateur"); await logout();
  await navigate("login"); await instrumentRequests();
  await fill("login", { email: workerEmail, password: "incorrect-password" }); await submit("login");
  await browser.until("!!document.querySelector('[data-auth-form=login] .auth-error[role=alert]')");
  check(await evaluate("location.pathname === '/login' && !document.querySelector('[data-auth-form=login] .auth-submit').disabled"), "Real API error must remain accessible and allow retry");
  await desktopLayouts("login", "login-error");
  await evaluate("document.querySelector('[data-auth-form=login] .auth-password button').click()");
  check(await evaluate("document.querySelector('#login-password').type === 'text'"), "Show password remains functional");
  check(browser.errors.length === 0, "No runtime browser errors");
  console.log(`${checks} contrôles Chrome réussis : aucun défilement desktop, tous les champs visibles sur 12 résolutions, déplacement réel, inversion, historique, focus, saisies conservées, mobile, reduced motion, inscriptions et connexions réelles Travailleur/Recruteur/Admin, une requête par soumission.`);
} finally {
  await browser?.close();
  await db.user.deleteMany({ where: { email: { startsWith: prefix } } });
  await db.$disconnect();
}
