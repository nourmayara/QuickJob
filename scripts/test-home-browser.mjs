import assert from "node:assert/strict";
import nextEnv from "@next/env";
import { PrismaClient } from "@prisma/client";
import { openWorkerBrowser } from "./worker-browser-session.mjs";

nextEnv.loadEnvConfig(process.cwd());
const db = new PrismaClient();
const base = process.env.TEST_BASE_URL || "http://localhost:3100";
const prefix = `hybrid-home-${Date.now()}-`;
const password = "QuickJob-hybrid123!";
let browser, checks = 0;
const check = (value, message) => { assert.ok(value, message); checks++; };
const e = expression => browser.evaluate(expression);
const pause = ms => e(`new Promise(resolve=>setTimeout(resolve,${ms}))`);
async function navigate(route = "/") {
  await browser.cdp("Page.navigate", { url: base + route });
  await browser.until(`document.readyState==='complete' && location.pathname===${JSON.stringify(route.split("?")[0])}`);
  await browser.until(route.startsWith("/login") || route.startsWith("/register") ? "!!document.querySelector('.auth-experience') && document.querySelector('.auth-experience').dataset.moving==='false'" : "!!document.querySelector('.city-intent')");
  await e("document.fonts.ready");
}
async function metrics(width, height) { await browser.cdp("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 700 }); }
async function journey(value) {
  await e(`document.querySelector('.city-intent button:${value === "recruteur" ? "last" : "first"}-child').click()`);
  await browser.until(`document.querySelector('.city-home').dataset.journey==='${value}'`);
}
async function step(value) {
  await e(`document.querySelectorAll('.city-journey button')[${value}].click()`);
  await browser.until(`document.querySelector('.city-home').dataset.step==='${value}'`);
}
async function fill(mode, values) {
  await e(`(() => {const form=document.querySelector('[data-auth-form="${mode}"]');for(const [name,value] of Object.entries(${JSON.stringify(values)})){const input=form.querySelector('[name="'+name+'"]');input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));}})()`);
}
async function logout() { check(await e("fetch('/api/auth/logout',{method:'POST'}).then(r=>r.ok)"), "Logout succeeds"); }
async function signup(intent, email) {
  await navigate(`/register?intent=${intent}`);
  check(await e(`document.querySelector('[data-auth-form=register] input[name=roleChoice]:checked').value==='${intent === "recruteur" ? "RECRUTEUR" : "TRAVAILLEUR"}'`), "The intended registration role is preselected");
  await e("document.querySelector('[data-auth-form=register] .auth-submit').click()");
  await browser.until("!document.querySelector('[data-auth-form=register] .auth-inputs').hidden");
  await fill("register", {name:"Recette",firstName:"Amira",phone:"+216 12345678",email,password,confirmPassword:password});
  await e("document.querySelector('[name=acceptTerms]').click();document.querySelector('[data-auth-form=register] .auth-submit').click()");
  const destination = intent === "recruteur" ? "/recruteur/missions/nouvelle" : "/dashboard/travailleur/missions";
  await browser.until(`location.pathname==='${destination}' && !!document.querySelector('.rq-app')`);
  check((await db.user.findUniqueOrThrow({where:{email}})).role === (intent === "recruteur" ? "RECRUTEUR" : "TRAVAILLEUR"), "Registration keeps the legitimate chosen role");
  checks++;
}
async function login(intent, email, destination) {
  await navigate(`/login?intent=${encodeURIComponent(intent)}&next=https%3A%2F%2Fexample.invalid`);
  await fill("login", {email,password});
  await e("document.querySelector('[data-auth-form=login] .auth-submit').click()");
  await browser.until(`location.pathname==='${destination}' && !!document.querySelector('.rq-app')`);
  check(await e(`location.origin===${JSON.stringify(base)}`), "No untrusted return URL is followed");
}

try {
  browser = await openWorkerBrowser(base);
  await browser.cdp("Page.addScriptToEvaluateOnNewDocument", {source:"window.__cityDraws=0;for(const name of ['drawElements','drawArrays']){const original=WebGL2RenderingContext.prototype[name];WebGL2RenderingContext.prototype[name]=function(...args){window.__cityDraws++;return original.apply(this,args)}}"});
  await metrics(1440,900); await navigate();
  await browser.until("document.querySelector('.city-scene').dataset.renderer==='webgl'");
  await pause(1400);
  const initialDraws = await e("window.__cityDraws");
  check(initialDraws > 0, "The original Three.js city renders");
  await pause(500);
  check(await e(`window.__cityDraws===${initialDraws}`), "The renderer stops drawing when idle");
  check(await e("!document.querySelector('.pin-spacer')"), "Native scrolling has no pinned journey");
  check(await e("document.querySelector('#city-main-action').getAttribute('href')==='/register?intent=travailleur'"), "Worker action opens real authentication with intent");
  await step(1); await pause(1100);
  check(await e(`window.__cityDraws>${initialDraws}`), "The camera renders its bounded transition on a step change");
  const settledDraws = await e("window.__cityDraws"); await pause(400);
  check(await e(`window.__cityDraws===${settledDraws}`), "The camera settles after the transition");
  await journey("recruteur");
  check(await e("document.querySelector('.city-home').dataset.step==='0' && document.querySelector('.city-journey').textContent.includes('Examiner')"), "Recruiter journey has its own three steps");
  await e("document.querySelector('.city-content .city-secondary').click()");
  await browser.until("document.querySelector('.city-home').dataset.overview==='true'");
  check(await e("[...document.querySelectorAll('.city-poi')].filter(b=>!b.hidden).length===5"), "Free exploration exposes all five sectors");
  await pause(1100);
  check(await e("(() => {const boxes=[...document.querySelectorAll('.city-poi')].filter(b=>!b.hidden).map(b=>b.getBoundingClientRect());return boxes.every((a,i)=>boxes.every((b,j)=>i===j || a.right<=b.left || b.right<=a.left || a.bottom<=b.top || b.bottom<=a.top));})()"), "Free exploration labels never overlap");
  await browser.screenshot("hybrid-home-exploration.png");
  await e("document.querySelector('[data-place=workspace]').click()");
  await browser.until("document.querySelector('.city-home').dataset.step==='1'");
  check(await e("document.querySelector('[data-place=workspace]').getAttribute('aria-pressed')==='true' && document.querySelector('.city-scene-caption').textContent.includes('Bureaux')"), "A point of interest updates the same journey and feedback");
  await journey("travailleur");
  check(await e("document.querySelector('.city-home').dataset.step==='1'"), "Switching journeys preserves the previous step");
  await journey("recruteur");
  await e("document.querySelector('#city-main-action').click()");
  await browser.until("location.pathname==='/register' && !!document.querySelector('[data-auth-form=register]')");
  check(await e("document.querySelector('[name=roleChoice]:checked').value==='RECRUTEUR'"), "Recruiter CTA never defaults to worker signup");
  await e("document.querySelector('[data-form-mode=register] .auth-switch a').click()");
  await browser.until("location.pathname==='/login' && document.querySelector('.auth-experience').dataset.moving==='false'");
  check(await e("new URLSearchParams(location.search).get('intent')==='recruteur'"), "Intent survives the Login/Register transition");

  for(const [width,height] of [[1920,1080],[1440,900],[1366,768],[1024,768],[800,900],[768,1024],[390,844],[360,640],[320,568]]) {
    await metrics(width,height); await navigate();
    if(width>=1024) await browser.until("document.querySelector('.city-scene').dataset.renderer==='webgl'");
    else check(await e("!document.querySelector('canvas')"), `${width}: lightweight illustration by default`);
    for(const kind of ["travailleur","recruteur"]) {
      await journey(kind);
      for(const index of [0,1,2]) {
        await step(index);
        const fit = await e("(() => {const copy=document.querySelector('.city-content').getBoundingClientRect(),visual=document.querySelector('.city-visual').getBoundingClientRect(),rail=document.querySelector('.city-journey').getBoundingClientRect();return {width:document.documentElement.scrollWidth,viewport:innerWidth,copyRight:copy.right,visualLeft:visual.left,copyBottom:copy.bottom,railTop:rail.top,railBottom:rail.bottom,visualTop:visual.top,href:document.querySelector('#city-main-action').getAttribute('href')}})()");
        check(fit.width<=width, `${width} ${kind} ${index}: no horizontal overflow ${JSON.stringify(fit)}`);
        check(width>700 ? fit.copyRight<=fit.visualLeft : fit.copyBottom<=fit.railTop && fit.railBottom<=fit.visualTop, `${width}: scene and reading area never overlap ${JSON.stringify(fit)}`);
        check(fit.href===`/register?intent=${kind}`, `${width}: action remains linked to the selected intention`);
      }
    }
    await journey("travailleur"); await step(0); await e("window.scrollTo({top:0,behavior:'instant'})"); await pause(350);
    const targets = await e("[...document.querySelectorAll('.city-intent button,.city-journey button,.city-poi')].filter(b=>!b.hidden).map(b=>({label:b.textContent.trim(),height:b.getBoundingClientRect().height}))");
    check(targets.every(target=>target.height>=43.99), `${width}: comfortable touch targets ${JSON.stringify(targets)}`);
    check(await e("![...document.querySelectorAll('.city-home *')].some(el=>el.clientHeight>0 && el.scrollHeight>el.clientHeight+2 && ['auto','scroll'].includes(getComputedStyle(el).overflowY))"), `${width}: no nested scrolling`);
    await browser.screenshot(`hybrid-home-${width}x${height}.png`);
    if(width===390) {
      await e("document.querySelector('.city-content .city-secondary').click()");
      await browser.until("(() => {const r=document.querySelector('.city-visual').getBoundingClientRect();return r.top>=0 && r.bottom<=innerHeight+1;})()");
      check(await e("document.activeElement.matches('.city-poi')"), "Mobile exploration brings the actual city into view and focuses its controls");
      await e("document.querySelector('.city-render-toggle').click()");
      await browser.until("document.querySelector('.city-scene').dataset.renderer==='webgl'");
      check(await e("!!document.querySelector('canvas')"), "Mobile 3D loads only on request");
      await e("document.querySelector('[data-place=event]').click()");
      check(await e("document.querySelector('.city-scene-caption').textContent.includes('Événementiel')"), "Requested mobile 3D keeps sector feedback");
      await e("document.querySelector('.city-render-toggle').click()");
      await browser.until("!document.querySelector('canvas')");
      check(await e("!!document.querySelector('.city-fallback svg') && document.querySelector('[data-place=event]').getAttribute('aria-pressed')==='true'"), "Illustration and 3D share the same selection");
      check(await e("document.documentElement.scrollWidth<=innerWidth && [...document.querySelectorAll('.city-poi')].filter(b=>!b.hidden).every(b=>getComputedStyle(b).transform==='none')"), "Switching back to illustration clears projected positions");
    }
    if(width<1024) {
      await e("document.querySelector('.city-menu-button').click()");
      await browser.until("document.querySelector('.city-menu').classList.contains('is-open')");
      check(await e("getComputedStyle(document.querySelector('.city-menu')).backgroundColor==='rgb(20, 27, 48)' && getComputedStyle(document.querySelector('.city-menu>a')).color==='rgb(224, 222, 240)'"), `${width}: readable dark tablet/mobile menu`);
      await e("document.querySelector('.city-menu>a').focus()");
      await browser.cdp("Input.dispatchKeyEvent",{type:"keyDown",key:"Escape",code:"Escape",windowsVirtualKeyCode:27});
      await browser.cdp("Input.dispatchKeyEvent",{type:"keyUp",key:"Escape",code:"Escape",windowsVirtualKeyCode:27});
      check(await e("document.activeElement.matches('.city-menu-button') && !document.querySelector('.city-menu').classList.contains('is-open')"), `${width}: Escape closes the menu and restores focus`);
    }
  }
  await metrics(1440,900); await navigate();
  await e("document.activeElement?.blur()");
  for(const type of ["keyDown","keyUp"]) await browser.cdp("Input.dispatchKeyEvent",{type,key:"Tab",code:"Tab",windowsVirtualKeyCode:9});
  check(await e("document.activeElement.matches('.city-skip')"), "Keyboard starts with a useful skip link");
  for(const type of ["keyDown","keyUp"]) await browser.cdp("Input.dispatchKeyEvent",{type,key:"Enter",code:"Enter",windowsVirtualKeyCode:13});
  check(await e("document.activeElement.id==='city-main-action'"), "Skip link reaches the genuine main action");
  await browser.until("document.querySelector('.city-scene').dataset.renderer==='webgl'");
  await e("document.querySelector('canvas').dispatchEvent(new Event('webglcontextlost',{cancelable:true}))");
  await browser.until("!document.querySelector('canvas') && !!document.querySelector('.city-render-note')");
  check(await e("document.querySelector('#city-main-action').getAttribute('href')==='/register?intent=travailleur'"), "Context loss retains the true main action and falls back gracefully");
  await browser.cdp("Emulation.setEmulatedMedia",{features:[{name:"prefers-reduced-motion",value:"reduce"}]});
  await navigate();
  await browser.until("!!document.querySelector('.city-render-note')");
  check(await e("!document.querySelector('canvas') && getComputedStyle(document.querySelector('.city-copy-inner')).animationName==='none'"), "Reduced motion does not load WebGL or animate copy");
  await e("document.querySelector('.city-content .city-secondary').click()");
  check(await e("document.querySelectorAll('.city-poi').length===5 && [...document.querySelectorAll('.city-poi')].filter(b=>!b.hidden).length===5"), "Reduced motion has one copy of each point of interest");
  await journey("recruteur"); await step(2);
  check(await e("document.querySelector('#city-main-action').getAttribute('href')==='/register?intent=recruteur'"), "Reduced motion retains all actions");
  await browser.screenshot("hybrid-home-reduced-motion.png");
  await browser.cdp("Emulation.setEmulatedMedia",{features:[]});
  const noGL = await browser.cdp("Page.addScriptToEvaluateOnNewDocument",{source:"const originalContext=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:originalContext.call(this,type,...args)}"});
  await navigate(); await browser.until("!!document.querySelector('.city-render-note')");
  check(await e("!document.querySelector('canvas') && !!document.querySelector('.city-fallback svg')"), "No WebGL gracefully falls back to the city illustration");
  await journey("recruteur"); await step(1);
  check(await e("document.querySelector('.city-home').dataset.step==='1'"), "No WebGL retains the guided journey");
  await browser.screenshot("hybrid-home-no-webgl.png");
  await browser.cdp("Page.removeScriptToEvaluateOnNewDocument",{identifier:noGL.identifier});

  const recruiterEmail=prefix+"recruiter@example.invalid",workerEmail=prefix+"worker@example.invalid";
  await signup("recruteur",recruiterEmail);
  await navigate();
  check(await e("document.querySelector('.city-home').dataset.journey==='recruteur' && document.querySelector('#city-main-action').getAttribute('href')==='/recruteur/missions/nouvelle'"), "Authenticated recruiter goes straight to mission publication");
  await logout();
  await signup("travailleur",workerEmail);
  await navigate();
  check(await e("document.querySelector('#city-main-action').getAttribute('href')==='/dashboard/travailleur/missions'"), "Authenticated worker goes straight to real missions");
  await journey("recruteur");
  check(await e("document.querySelector('#city-main-action').getAttribute('href')==='/dashboard/travailleur' && document.querySelector('#city-main-action').textContent.includes('mon espace')"), "Exploring another journey never grants another role");
  check(await e("fetch('/api/recruteur/profil',{method:'PATCH',headers:{'Content-Type':'application/json'},body:'{}'}).then(r=>r.status===403)"), "Worker remains forbidden from recruiter API");
  await logout();
  await login("recruteur",workerEmail,"/dashboard/travailleur"); await logout();
  await login("recruteur",recruiterEmail,"/recruteur/missions/nouvelle"); await logout();
  await login("ADMIN",recruiterEmail,"/recruteur/dashboard"); await logout();
  await navigate("/register?intent=ADMIN");
  check(await e("document.querySelector('[name=roleChoice]:checked').value==='TRAVAILLEUR' && !document.querySelector('[name=roleChoice][value=ADMIN]')"), "Unrecognized intentions cannot preselect privileged roles");
  check(await e("fetch('/api/missions',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}).then(r=>r.status===401)"), "Guest query parameters cannot bypass private actions");
  check(browser.errors.length===0,`No browser runtime errors: ${browser.errors.join(', ')}`);
  console.log(`${checks} contrôles Home hybride réussis : parcours, exploration, caméra au repos, neuf résolutions, clavier, mode réduit, sans WebGL, vraies inscriptions et connexions, autorisations et intentions sûres.`);
} catch(error) {
  await browser?.screenshot("hybrid-home-failure.png");
  if(browser) console.log(await e("({path:location.pathname,heading:document.querySelector('h1')?.textContent,alerts:[...document.querySelectorAll('[role=alert]')].map(el=>el.textContent)})"));
  throw error;
} finally {
  await browser?.close();
  await db.user.deleteMany({where:{email:{startsWith:prefix}}});
  await db.$disconnect();
}
