import assert from "node:assert/strict";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { openWorkerBrowser } from "./worker-browser-session.mjs";

// This visual suite only creates data in an explicitly supplied, isolated copy.
const database = process.env.DASHBOARD_UI_DATABASE_URL;
assert.ok(database?.replaceAll("\\", "/").includes("/.artifacts/"), "Supply an isolated .artifacts database with DASHBOARD_UI_DATABASE_URL");
const base = process.env.TEST_BASE_URL;
assert.ok(base, "TEST_BASE_URL must point at a server using that same database");
const db = new PrismaClient({ datasourceUrl: database });
const prefix = `dashboard-ui-${Date.now()}`;
const password = "Dashboard-ui123!";
let browser;

async function user(role, firstName, extra = {}) {
  return db.user.create({ data: { name:"Ben Ali",firstName,email:`${prefix}-${role}-${firstName}@example.invalid`.toLowerCase(),password:await bcrypt.hash(password,10),phone:"+216 12345678",role,city:"Tunis",skills:"Accueil, organisation",languages:"Arabe, français",...extra } });
}
async function login(account) {
  const response = await fetch(`${base}/api/auth/login`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:account.email,password})});
  assert.equal(response.status,200,await response.clone().text());
  return response.headers.get("set-cookie").split(";")[0];
}
async function visit(route,cookie) {
  // Compile routes before navigating so Chrome's CDP deadline is not a compile timeout.
  const response=await fetch(base+route,{headers:{Cookie:cookie}});
  assert.equal(response.status,200,`${route}: HTTP ${response.status}`);
  const html=await response.text();
  assert.ok(!html.includes('id="__next_error__"'),`${route}: server error`);
  await browser.cdp("Page.navigate",{url:base+route});
  await browser.until(`document.readyState==='complete' && !!document.querySelector('.rq-app') && location.pathname===${JSON.stringify(route.split("?")[0])}`);
}
async function inspect(route,width,height) {
  await browser.cdp("Emulation.setDeviceMetricsOverride",{width,height,deviceScaleFactor:1,mobile:false});
  const result=await browser.evaluate(`(async()=>{
    await document.fonts.ready;
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const workspace=document.querySelector('.rq-workspace');
    const primary=[...document.querySelectorAll('.rq-primary')].filter(e=>e.getClientRects().length);
    return {width:innerWidth,scroll:document.documentElement.scrollWidth,aurora:getComputedStyle(workspace).backgroundImage,token:getComputedStyle(workspace).getPropertyValue('--qj-aurora').trim(),
      badButtons:primary.filter(e=>{const s=getComputedStyle(e);return s.color!=='rgb(255, 255, 255)'||!s.backgroundImage.includes('linear-gradient');}).map(e=>e.textContent),
      badInputs:[...document.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=hidden]),textarea,select')].filter(e=>e.getClientRects().length&&parseFloat(getComputedStyle(e).borderTopLeftRadius)<12).map(e=>e.name)};
  })()`);
  assert.ok(result.scroll<=width,`${route} ${width}: horizontal overflow ${result.scroll}`);
  assert.ok(result.aurora.includes("radial-gradient"),`${route}: Aurora background`);
  assert.deepEqual(result.badButtons,[],`${route}: primary button contrast`);
  assert.deepEqual(result.badInputs,[],`${route}: rounded fields`);
}
try {
  const admin=await user("ADMIN","Nour");
  const recruiter=await user("RECRUTEUR","Youssef",{companyName:"Studio Horizon",recruiterType:"COMPANY",recruiterVerification:{create:{status:"APPROUVE",decidedAt:new Date()}}});
  const pending=await user("RECRUTEUR","Leila",{recruiterType:"INDIVIDUAL",recruiterVerification:{create:{status:"EN_ATTENTE"}}});
  const worker=await user("TRAVAILLEUR","Amira");
  const common={description:"Accueillir les visiteurs, organiser les espaces et accompagner une équipe professionnelle pendant un événement à Tunis.",category:"Services",city:"Tunis",address:"12 avenue Habib Bourguiba",date:new Date("2030-12-15T00:00:00Z"),startTime:"09:00",endTime:"13:00",pay:95,capacity:4,recruiterId:recruiter.id,status:"PUBLISHED"};
  const mission=await db.mission.create({data:{...common,title:"Accueil et organisation événementielle"}});
  const available=await db.mission.create({data:{...common,title:"Animation et accueil en boutique",date:new Date("2030-12-20T00:00:00Z")}});
  const application=await db.application.create({data:{missionId:mission.id,workerId:worker.id,status:"ACCEPTED",message:"Disponible et motivée pour rejoindre votre équipe."}});
  await db.message.createMany({data:[{applicationId:application.id,senderId:recruiter.id,body:"Bonjour Amira, bienvenue dans l’équipe ! Le rendez-vous est prévu à 8 h 45."},{applicationId:application.id,senderId:worker.id,body:"Bonjour, merci pour votre confiance. Je serai présente à l’heure."}]});
  await db.notification.create({data:{userId:worker.id,message:"Votre candidature a été acceptée pour la mission Accueil et organisation événementielle."}});
  await db.availability.create({data:{workerId:worker.id,startAt:new Date("2030-12-18T08:00:00Z"),endAt:new Date("2030-12-18T16:00:00Z"),kind:"AVAILABLE",note:"Disponible pour une mission"}});
  const report=await db.report.create({data:{kind:"MISSION",reason:"Vérifier les informations de cette mission de démonstration.",authorId:worker.id,missionId:available.id}});
  browser=await openWorkerBrowser(base);
  const actors=[
    {name:"worker",account:worker,routes:["/dashboard/travailleur","/dashboard/travailleur/missions",`/dashboard/travailleur/missions/${available.id}`,"/dashboard/travailleur/candidatures",`/dashboard/travailleur/candidatures/${application.id}`,"/dashboard/travailleur/calendrier?month=2030-12",`/dashboard/travailleur/messages?application=${application.id}`,"/dashboard/travailleur/notifications","/dashboard/travailleur/profil","/dashboard/travailleur/favoris"]},
    {name:"recruiter",account:recruiter,routes:["/recruteur/dashboard","/recruteur/missions","/recruteur/missions/nouvelle",`/recruteur/missions/${mission.id}`,`/recruteur/missions/${mission.id}/modifier`,"/recruteur/candidatures",`/recruteur/candidatures/${application.id}`,"/recruteur/travailleurs",`/recruteur/messages?application=${application.id}`,"/recruteur/profil","/recruteur/parametres"]},
    {name:"admin",account:admin,routes:["/dashboard/administrateur","/admin/utilisateurs",`/admin/utilisateurs/${worker.id}`,"/admin/recruteurs",`/admin/recruteurs/${pending.id}`,"/admin/missions",`/admin/missions/${mission.id}`,"/admin/signalements",`/admin/signalements/${report.id}`,"/admin/categories"]}
  ];
  for(const actor of actors){
    const cookie=await login(actor.account);await browser.cookie(cookie);
    for(const [i,route] of actor.routes.entries()){
      await visit(route,cookie);
      for(const [width,height] of [[1440,1000],[900,900],[390,844]])await inspect(route,width,height);
      if(i===0||route.includes("messages?")||route.includes("calendrier")){
        await browser.screenshot(`dashboard-ui-${actor.name}-${i}-mobile.png`);
        await browser.cdp("Emulation.setDeviceMetricsOverride",{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
        await browser.screenshot(`dashboard-ui-${actor.name}-${i}-desktop.png`);
      }
      if(i===0){
        await browser.cdp("Emulation.setDeviceMetricsOverride",{width:390,height:844,deviceScaleFactor:1,mobile:false});
        await browser.evaluate("document.querySelector('.rq-menu').click()");
        await browser.until("document.querySelector('.rq-sidebar').classList.contains('is-open')");
        await browser.evaluate("document.querySelector('.rq-mobile-close').click()");
        await browser.until("!document.querySelector('.rq-sidebar').classList.contains('is-open')");
      }
      if(actor.name==="recruiter"&&route===`/recruteur/missions/${mission.id}`){
        await browser.cdp("Emulation.setDeviceMetricsOverride",{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
        await browser.evaluate("[...document.querySelectorAll('button')].find(e=>e.textContent==='Clôturer les candidatures').click()");
        await browser.until("!!document.querySelector('[role=dialog]')");
        await browser.screenshot("dashboard-ui-modal.png");
        await browser.cdp("Input.dispatchKeyEvent",{type:"keyDown",key:"Escape",code:"Escape",windowsVirtualKeyCode:27});
        await browser.until("!document.querySelector('[role=dialog]')");
      }
      console.log(`PASS ${actor.name} ${route} — desktop/tablet/mobile`);
    }
  }
  console.log(`PASS all ${actors.reduce((n,a)=>n+a.routes.length,0)} dashboard routes; navigation, modal and responsive styles`);
} finally {
  await browser?.close();
  await db.$disconnect();
}
