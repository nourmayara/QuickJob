import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import env from "@next/env";
import {PrismaClient} from "@prisma/client";
import {writeFile} from "node:fs/promises";
import {openWorkerBrowser} from "./worker-browser-session.mjs";
env.loadEnvConfig(process.cwd());
const db=new PrismaClient(),base=process.env.TEST_BASE_URL||"http://localhost:3100",prefix=`verification-ui-${Date.now()}-`,password="QuickJob-ui123!";
let recruiterBrowser,adminBrowser,checks=0;
const check=(value,message)=>{assert.ok(value,message);checks++;};
async function json(path,body,cookie="",method="POST"){const response=await fetch(base+path,{method,headers:{"Content-Type":"application/json",...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)});check(response.ok,`${path}: ${response.status}`);return {data:await response.json(),cookie:response.headers.get("set-cookie")?.split(";")[0]};}
async function register(suffix){const email=`${prefix}${suffix}@example.invalid`;const result=await json("/api/auth/register",{role:"RECRUTEUR",recruiterType:"INDIVIDUAL",name:"Recette",firstName:"Amira",phone:"+216 12345678",email,password,confirmPassword:password,acceptTerms:true});return {...result.data,email,cookie:result.cookie};}
async function navigate(browser,path,selector){await browser.cdp("Page.navigate",{url:base+path});await browser.until(`document.readyState==='complete'&&!!document.querySelector(${JSON.stringify(selector)})`);await browser.evaluate("document.fonts.ready");}
async function viewport(browser,width,height){await browser.cdp("Emulation.setDeviceMetricsOverride",{width,height,deviceScaleFactor:1,mobile:width<700});}
async function fill(browser,selector,values){await browser.evaluate(`(()=>{const form=document.querySelector(${JSON.stringify(selector)});for(const [key,value] of Object.entries(${JSON.stringify(values)})){const input=form.querySelector('[name="'+key+'"]');input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));}})()`);}
async function confirmAdmin(choice){await adminBrowser.evaluate(`[...document.querySelectorAll('.rq-detail-actions button')].find(button=>button.textContent===${JSON.stringify(choice)}).click()`);await adminBrowser.until("!!document.querySelector('form.rq-confirm')");}
try{
 const admin=await db.user.create({data:{name:"Admin recette",firstName:"Sarah",role:"ADMIN",email:`${prefix}admin@example.invalid`,password:await bcrypt.hash(password,10)}});
 const auth=await json("/api/auth/login",{email:admin.email,password});
 recruiterBrowser=await openWorkerBrowser(base);adminBrowser=await openWorkerBrowser(base);await adminBrowser.cookie(auth.cookie);
 await viewport(recruiterBrowser,1440,900);await viewport(adminBrowser,1440,900);
 await navigate(recruiterBrowser,"/register?intent=recruteur","[data-auth-form=register]");
 await recruiterBrowser.until("document.querySelector('.auth-experience').dataset.moving==='false'");
 check(await recruiterBrowser.evaluate("document.querySelector('[data-auth-form=register] input[name=roleChoice]:checked').value==='RECRUTEUR'"),"Recruiter registration role remains preselected");
 await recruiterBrowser.evaluate("document.querySelector('[data-auth-form=register] .auth-submit').click()");
 await recruiterBrowser.until("!document.querySelector('[data-auth-form=register] .auth-inputs').hidden");
 const email=`${prefix}signup@example.invalid`;
 await fill(recruiterBrowser,"[data-auth-form=register]",{name:"Recette",firstName:"Amira",phone:"+216 12345678",email,password,confirmPassword:password});
 await recruiterBrowser.evaluate("document.querySelector('[name=acceptTerms]').click();document.querySelector('[data-auth-form=register] .auth-submit').click()");
 await recruiterBrowser.until("location.pathname==='/recruteur/en-attente'&&!!document.querySelector('.qv-card')");
 const pending=await db.user.findUniqueOrThrow({where:{email},include:{recruiterVerification:true}});
 check(pending.recruiterVerification.status==="EN_ATTENTE","Actual UI registration opens waiting page with a real pending request");
 for(const [width,height] of [[1920,1080],[1366,768],[768,1024],[390,844],[320,568]]){
  await viewport(recruiterBrowser,width,height);
  check(await recruiterBrowser.evaluate("document.documentElement.scrollWidth<=innerWidth"),`${width}: waiting page has no horizontal overflow`);
  check(await recruiterBrowser.evaluate("document.querySelector('.qv-card').getBoundingClientRect().width<=innerWidth"),`${width}: central card fits`);
  check(await recruiterBrowser.evaluate("[...document.querySelectorAll('.qv-actions button,.qv-actions a')].every(element=>element.getBoundingClientRect().height>=44)"),`${width}: comfortable touch controls`);
  if(width===1366||width===390)await recruiterBrowser.screenshot(`verification-waiting-${width}.png`);
 }
 await viewport(recruiterBrowser,1440,900);
 await recruiterBrowser.evaluate("window.__verificationFetch=window.fetch;window.fetch=(input,...args)=>String(input).includes('/api/recruteur/verification')?Promise.reject(new TypeError('Failed to fetch')):window.__verificationFetch(input,...args);document.querySelector('.qv-actions .rq-primary').click()");
 await recruiterBrowser.until("!!document.querySelector('[role=alert]')");check(await recruiterBrowser.evaluate("location.pathname==='/recruteur/en-attente'&&document.querySelector('[role=alert]').textContent.includes('Impossible')"),"Refresh network error is visible without false success");
 await recruiterBrowser.evaluate("window.fetch=window.__verificationFetch;document.querySelector('.qv-actions .rq-primary').click()");await recruiterBrowser.until("!!document.querySelector('.qv-feedback')");check(await recruiterBrowser.evaluate("document.querySelector('.qv-feedback').textContent.includes('toujours')"),"Pending refresh stays on waiting page");
 await navigate(adminBrowser,"/dashboard/administrateur",".rq-sidebar");check(await adminBrowser.evaluate("!!document.querySelector('a[href=\"/admin/recruteurs\"]')"),"Admin sidebar contains recruiter verification");
 await navigate(adminBrowser,"/admin/recruteurs",".qa-table");check(await adminBrowser.evaluate(`document.body.textContent.includes(${JSON.stringify(email)})`),"Admin list shows actual signup");
 for(const [width,height] of [[1440,900],[768,1024],[390,844],[320,568]]){await viewport(adminBrowser,width,height);check(await adminBrowser.evaluate("document.documentElement.scrollWidth<=innerWidth"),`${width}: admin table contained in its responsive panel`);}
 await viewport(adminBrowser,1440,900);await navigate(adminBrowser,`/admin/recruteurs/${pending.id}`,".rq-detail-actions");await confirmAdmin("Approuver");
 check((await db.recruiterVerification.findUniqueOrThrow({where:{userId:pending.id}})).status==="EN_ATTENTE","Opening confirmation does not approve the account");
 await adminBrowser.evaluate("document.querySelector('form.rq-confirm button:not([type=button])').click()");await adminBrowser.until("document.querySelector('.qa-badge')?.textContent==='Approuvé'");
 check(await db.notification.count({where:{userId:pending.id}})===1,"Admin UI approval persists notification");
 await recruiterBrowser.evaluate("document.querySelector('.qv-actions .rq-primary').click()");await recruiterBrowser.until("location.pathname==='/recruteur/dashboard'&&!!document.querySelector('.rq-app')");check(await recruiterBrowser.evaluate("document.body.textContent.includes('a été approuvé')"),"Refresh activates dashboard and displays approval notification");
 const refused=await register("refusal");await recruiterBrowser.cookie(refused.cookie);await navigate(recruiterBrowser,"/recruteur/en-attente",".qv-card");
 await navigate(adminBrowser,`/admin/recruteurs/${refused.id}`,".rq-detail-actions");await confirmAdmin("Refuser");
 check(await adminBrowser.evaluate("document.querySelector('form.rq-confirm button:not([type=button])').disabled&&document.querySelector('.qa-reason textarea').required"),"Refusal requires a reason before confirmation");
 const reason="Les informations de votre organisation doivent être précisées.";
 await adminBrowser.evaluate("document.querySelector('.qa-reason textarea').focus()");await adminBrowser.cdp("Input.insertText",{text:reason});await adminBrowser.evaluate("document.querySelector('form.rq-confirm button:not([type=button])').click()");await adminBrowser.until("document.querySelector('.qa-badge')?.textContent==='Refusé'");
 await recruiterBrowser.evaluate("document.querySelector('.qv-actions .rq-primary').click()");await recruiterBrowser.until("location.pathname==='/recruteur/refuse'&&!!document.querySelector('.qv-reason')");
 check(await recruiterBrowser.evaluate(`document.querySelector('.qv-reason').textContent.includes(${JSON.stringify(reason)})`),"Refusal refresh opens real reason");
 await viewport(recruiterBrowser,390,844);check(await recruiterBrowser.evaluate("document.documentElement.scrollWidth<=innerWidth"),"Refusal page fits mobile");await recruiterBrowser.screenshot("verification-refused-mobile.png");
 const network=await register("network");await navigate(adminBrowser,`/admin/recruteurs/${network.id}`,".rq-detail-actions");await confirmAdmin("Approuver");
 await adminBrowser.evaluate("window.__decisionFetch=window.fetch;window.fetch=(input,...args)=>String(input).includes('/api/admin/recruteurs/')?Promise.reject(new TypeError('Failed to fetch')):window.__decisionFetch(input,...args);document.querySelector('form.rq-confirm button:not([type=button])').click()");await adminBrowser.until("!!document.querySelector('[role=alert]')");
 check(await adminBrowser.evaluate("document.querySelector('[role=alert]').textContent.includes('Connexion')&&!!document.querySelector('form.rq-confirm')"),"Admin network failure keeps confirmation and shows actionable error");check((await db.recruiterVerification.findUniqueOrThrow({where:{userId:network.id}})).status==="EN_ATTENTE","Network failure never changes database status");await adminBrowser.evaluate("window.fetch=window.__decisionFetch");
 await recruiterBrowser.evaluate("document.querySelector('.qv-actions .button').click()");await recruiterBrowser.until("location.pathname==='/login'");
 await viewport(recruiterBrowser,1440,900);await navigate(recruiterBrowser,"/login?intent=travailleur","[data-auth-form=login]");await recruiterBrowser.until("document.querySelector('.auth-experience').dataset.moving==='false'");await fill(recruiterBrowser,"[data-auth-form=login]",{email:network.email,password});await recruiterBrowser.evaluate("document.querySelector('[data-auth-form=login] .auth-submit').click()");await recruiterBrowser.until("location.pathname==='/recruteur/en-attente'&&!!document.querySelector('.qv-card')");check(true,"Pending recruiter login respects real status despite worker intent");
 await recruiterBrowser.evaluate("document.querySelector('.qv-actions .button').click()");await recruiterBrowser.until("location.pathname==='/login'");await navigate(recruiterBrowser,"/recruteur/dashboard","[data-auth-form=login]");check(await recruiterBrowser.evaluate("location.pathname==='/login'"),"Logout prevents private page access");
 check(recruiterBrowser.errors.length===0&&adminBrowser.errors.length===0,"No browser JavaScript exceptions");
 await writeFile(".artifacts/recruiter-verification-browser.json",JSON.stringify({checks,viewports:5},null,2));console.log(`${checks} contrôles Chrome validation Recruteur réussis : inscription réelle, attente, admin, confirmations, approbation/refus, actualisation, mobile, erreurs réseau, connexion/déconnexion.`);
}finally{
 await Promise.all([recruiterBrowser?.close(),adminBrowser?.close()]);await db.user.deleteMany({where:{email:{startsWith:prefix}}});await db.$disconnect();
}
