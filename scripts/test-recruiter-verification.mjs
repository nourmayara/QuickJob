import assert from "node:assert/strict";
import {readFile,readdir,writeFile} from "node:fs/promises";
import {DatabaseSync} from "node:sqlite";
import {createHash} from "node:crypto";
import {spawnSync} from "node:child_process";
import bcrypt from "bcryptjs";
import env from "@next/env";
import {PrismaClient} from "@prisma/client";
env.loadEnvConfig(process.cwd());
const db=new PrismaClient(),base=process.env.TEST_BASE_URL||"http://localhost:3100",prefix=`verification-${Date.now()}-`,password="QuickJob-test123!";
let checks=0;
const check=(condition,label)=>{assert.ok(condition,label);checks++;};
async function call(path,code,cookie="",method="GET",body){const response=await fetch(base+path,{method,redirect:"manual",headers:{...(cookie?{Cookie:cookie}:{}),...(body?{"Content-Type":"application/json"}:{})},body:body?JSON.stringify(body):undefined});const text=await response.clone().text();check(response.status===code,`${method} ${path}: expected ${code}, got ${response.status}: ${text.slice(0,180)}`);return response;}
async function pageRedirect(path,cookie,destination){const response=await fetch(base+path,{headers:{Cookie:cookie},redirect:"manual"});const text=await response.text(),location=response.headers.get("location")||text.match(/NEXT_REDIRECT;(?:replace|push);([^;]+)/)?.[1];check(location?.endsWith(destination),`${path}: must redirect to ${destination}, got ${response.status} ${location}`);}
async function login(user){const response=await call("/api/auth/login",200,"","POST",{email:user.email,password});return {...await response.json(),email:user.email,cookie:response.headers.get("set-cookie").split(";")[0]};}
async function register(suffix,role="RECRUTEUR"){const response=await call("/api/auth/register",201,"","POST",{name:"Recette",firstName:"Amira",phone:"+216 12345678",email:`${prefix}${suffix}@example.invalid`,password,confirmPassword:password,acceptTerms:true,role,recruiterType:"INDIVIDUAL",status:"APPROUVE",recruiterVerification:{status:"APPROUVE"}});return {...await response.json(),cookie:response.headers.get("set-cookie").split(";")[0]};}
async function coreSnapshot(){const result={};for(const table of ["User","Session","Mission","Application"]){const rows=await db.$queryRawUnsafe(`SELECT * FROM "${table}" ORDER BY id`);result[table]=createHash("sha256").update(JSON.stringify(rows)).digest("hex");}return result;}
async function migrationTest(){const sqlite=new DatabaseSync(":memory:");try{
 const directories=(await readdir("prisma/migrations")).filter(name=>/^\d/.test(name)).sort();
 for(const directory of directories.filter(name=>name<"20261026180000_recruiter_verification"))sqlite.exec(await readFile(`prisma/migrations/${directory}/migration.sql`,"utf8"));
 sqlite.exec(`INSERT INTO "User" (id,name,email,password,role,suspended) VALUES (1,'Legacy','legacy@example.invalid','hash','RECRUTEUR',false),(2,'Worker','worker@example.invalid','hash','TRAVAILLEUR',false),(3,'Admin','admin@example.invalid','hash','ADMIN',false),(4,'Suspended','suspended@example.invalid','hash','RECRUTEUR',true);INSERT INTO Mission(id,title,description,recruiterId) VALUES(1,'Existing mission','Existing description',1);INSERT INTO Application(id,missionId,workerId) VALUES(1,1,2);INSERT INTO Session(id,userId,expiresAt) VALUES('legacy',1,'2030-01-01');`);
 const before={};for(const table of ["User","Session","Mission","Application"])before[table]=sqlite.prepare(`SELECT * FROM "${table}" ORDER BY id`).all();
 sqlite.exec(await readFile("prisma/migrations/20261026180000_recruiter_verification/migration.sql","utf8"));
 for(const table of Object.keys(before)){assert.deepEqual(sqlite.prepare(`SELECT * FROM "${table}" ORDER BY id`).all(),before[table]);checks++;}
 const legacy=sqlite.prepare("SELECT * FROM RecruiterVerification ORDER BY userId").all();check(legacy.length===2&&legacy.every(row=>row.status==="APPROUVE"&&row.legacy===1&&row.decidedAt===null&&row.decidedById===null&&row.requestedAt===null),"Migration preserves legacy access without invented decisions");
 check(sqlite.prepare("SELECT suspended FROM User WHERE id=4").get().suspended===1,"Migration preserves suspensions");
 for(const directory of directories.filter(name=>name>"20261026180000_recruiter_verification"))sqlite.exec(await readFile(`prisma/migrations/${directory}/migration.sql`,"utf8"));
 for(const table of Object.keys(before)){
  const columns=Object.keys(before[table][0]);
  const rows=sqlite.prepare(`SELECT * FROM "${table}" ORDER BY id`).all().map(row=>Object.fromEntries(columns.map(key=>[key,row[key]])));
  assert.deepEqual(rows,before[table].map(row=>({...row})),`${table}: original values preserved by later migrations`);checks++;
 }
 assert.deepEqual(sqlite.prepare("SELECT * FROM RecruiterVerification ORDER BY userId").all(),legacy,"Later migrations never approve or change existing recruiter decisions");checks++;
}finally{sqlite.close();}}
const missionInput={title:"Mission après approbation",description:"Accueil des visiteurs et préparation de la salle.",category:"Événementiel",city:"Tunis",address:"10 avenue de la Liberté",date:"2030-12-15",startTime:"09:00",endTime:"17:00",pay:80,capacity:2,skills:"Accueil",experience:"",status:"PUBLISHED"};
let before;
try{
 await migrationTest();before=await coreSnapshot();
 const hash=await bcrypt.hash(password,10);
 const admin=await login(await db.user.create({data:{name:"Admin test",firstName:"Sarah",email:`${prefix}admin@example.invalid`,password:hash,role:"ADMIN"}}));
 const admin2=await login(await db.user.create({data:{name:"Admin test 2",email:`${prefix}admin2@example.invalid`,password:hash,role:"ADMIN"}}));
 const pending=await register("pending"),refused=await register("refused"),race=await register("race"),suspended=await register("suspended"),worker=await register("worker","TRAVAILLEUR");
 check(pending.role==="RECRUTEUR"&&pending.recruiterVerification.status==="EN_ATTENTE","Browser-supplied approval is ignored");
 const request=await db.recruiterVerification.findUniqueOrThrow({where:{userId:pending.id}});check(!!request.requestedAt&&!request.legacy&&!request.decidedById&&!request.decidedAt,"Real pending request has request date and no decision");
 await call("/recruteur/en-attente",200,pending.cookie);
 for(const path of ["/recruteur/dashboard","/recruteur/missions","/recruteur/missions/nouvelle","/recruteur/candidatures","/recruteur/travailleurs","/recruteur/profil","/dashboard","/dashboard/recruteur"])await pageRedirect(path,pending.cookie,"/recruteur/en-attente");
 for(const [path,method,body] of [["/api/missions","GET"],["/api/missions","POST",missionInput],["/api/missions/1","GET"],["/api/missions/1","PATCH",{title:"Forbidden"}],["/api/applications","GET"],["/api/applications/1","PATCH",{status:"ACCEPTED"}],["/api/recruteur/profil","PATCH",{}]])await call(path,403,pending.cookie,method,body);
 check((await (await call("/api/recruteur/verification",200,pending.cookie)).json()).status==="EN_ATTENTE","Status endpoint remains accessible to pending recruiter");
 await call("/api/auth/logout",200,pending.cookie,"POST");await call("/api/missions",401,pending.cookie);
 const relogged=await login(pending);pending.cookie=relogged.cookie;check(relogged.recruiterVerification.status==="EN_ATTENTE","Login returns database verification status");
 await pageRedirect("/recruteur/dashboard",pending.cookie,"/recruteur/en-attente");
 await call("/api/admin/recruteurs",401);await call("/api/admin/recruteurs",403,worker.cookie);await call(`/api/admin/recruteurs/${pending.id}`,403,pending.cookie,"PATCH",{status:"APPROUVE"});
 await call(`/api/admin/recruteurs/${pending.id}`,403,worker.cookie,"PATCH",{status:"APPROUVE"});
 const list=await (await call("/api/admin/recruteurs",200,admin.cookie)).json();check(list.items.some(item=>item.userId===pending.id),"Admin sees real pending requests");
 const detail=await (await call(`/api/admin/recruteurs/${pending.id}`,200,admin.cookie)).json();check(!JSON.stringify(detail).includes("password")&&detail.user.email===pending.email,"Admin details expose no password hash");
 await call("/admin/recruteurs",200,admin.cookie);await call(`/admin/recruteurs/${pending.id}`,200,admin.cookie);
 await call(`/api/admin/recruteurs/${pending.id}`,400,admin.cookie,"PATCH",{status:"ADMIN"});await call(`/api/admin/recruteurs/${refused.id}`,400,admin.cookie,"PATCH",{status:"REFUSE",reason:"   "});
 await call(`/api/admin/recruteurs/${pending.id}`,200,admin.cookie,"PATCH",{status:"APPROUVE"});
 const approval=await db.recruiterVerification.findUniqueOrThrow({where:{userId:pending.id}});check(approval.decidedById===admin.id&&!!approval.decidedAt&&approval.refusalReason===null,"Approval records real admin and date");
 check((await (await call("/api/recruteur/verification",200,pending.cookie)).json()).destination==="/recruteur/dashboard","Refresh sees approval without a new session");
 await call("/recruteur/dashboard",200,pending.cookie);
 const mission=await (await call("/api/missions",201,pending.cookie,"POST",missionInput)).json();
 await call(`/api/missions/${mission.id}`,403,refused.cookie,"PATCH",{title:"Forbidden"});
 await call(`/api/admin/recruteurs/${pending.id}`,409,admin.cookie,"PATCH",{status:"REFUSE",reason:"Already processed"});
 const approvalNotifications=await (await call("/api/notifications",200,pending.cookie)).json();check(approvalNotifications.length===1&&approvalNotifications[0].message.includes("a été approuvé"),"One persisted approval notification, only for its recipient");
 check((await (await call("/api/notifications",200,worker.cookie)).json()).length===0,"Worker cannot read recruiter notification");
 await call(`/api/admin/recruteurs/${refused.id}`,200,admin.cookie,"PATCH",{status:"REFUSE",reason:"Veuillez préciser les informations de votre organisation."});
 await pageRedirect("/recruteur/dashboard",refused.cookie,"/recruteur/refuse");
 const refusalPage=await (await call("/recruteur/refuse",200,refused.cookie)).text();check(refusalPage.includes("Veuillez préciser les informations"),"Refusal page shows real reason");
 await call("/api/missions",403,refused.cookie,"POST",missionInput);check((await login(refused)).recruiterVerification.status==="REFUSE","Refused login keeps refused status");
 check((await db.notification.count({where:{userId:refused.id}}))===1,"Refusal notification persisted");
 const decisions=await Promise.all([[admin,"APPROUVE"],[admin2,"REFUSE"]].map(async([actor,status])=>fetch(`${base}/api/admin/recruteurs/${race.id}`,{method:"PATCH",headers:{Cookie:actor.cookie,"Content-Type":"application/json"},body:JSON.stringify({status,reason:"Concurrent refusal"})})));
 check(decisions.filter(response=>response.status===200).length===1&&decisions.every(response=>[200,409].includes(response.status)),`Exactly one concurrent decision succeeds: ${decisions.map(r=>r.status)}`);
 const concurrent=await db.recruiterVerification.findUniqueOrThrow({where:{userId:race.id}});check([admin.id,admin2.id].includes(concurrent.decidedById)&&await db.notification.count({where:{userId:race.id}})===1,"Concurrent decision has one audit record and notification");
 await call(`/api/admin/users/${suspended.id}`,200,admin.cookie,"PATCH",{suspended:true});
 await call("/api/recruteur/verification",401,suspended.cookie);await call("/api/auth/login",401,"","POST",{email:suspended.email,password});await call(`/api/admin/recruteurs/${suspended.id}`,409,admin.cookie,"PATCH",{status:"APPROUVE"});
 await call(`/api/admin/users/${pending.id}`,200,admin.cookie,"PATCH",{suspended:true});await call("/api/missions",401,pending.cookie);
 await call("/dashboard/travailleur",200,worker.cookie);await call("/api/missions",200,worker.cookie);await call("/dashboard/administrateur",200,admin.cookie);await call("/api/admin/statistics",200,admin.cookie);
 const legacy=await login(await db.user.create({data:{name:"Legacy fixture",email:`${prefix}legacy@example.invalid`,password:hash,role:"RECRUTEUR",recruiterVerification:{create:{status:"APPROUVE",legacy:true,requestedAt:null}}}}));await call("/recruteur/dashboard",200,legacy.cookie);await call("/api/missions",200,legacy.cookie);
 const missing=await login(await db.user.create({data:{name:"Missing request",email:`${prefix}missing@example.invalid`,password:hash,role:"RECRUTEUR"}}));await call("/api/missions",403,missing.cookie);await pageRedirect("/recruteur/dashboard",missing.cookie,"/recruteur/en-attente");
 const promoted=await register("promoted","TRAVAILLEUR");
 const promotion=spawnSync(process.execPath,["scripts/admin-role.mjs",String(promoted.id),"RECRUTEUR","--confirm"],{encoding:"utf8",windowsHide:true});
 check(promotion.status===0,"Trusted role utility still works");
 check((await db.recruiterVerification.findUniqueOrThrow({where:{userId:promoted.id}})).status==="EN_ATTENTE","Role utility creates a real pending verification without granting approval");
 await call("/api/auth/me",401,promoted.cookie);const promotedLogin=await login(promoted);await call("/api/missions",403,promotedLogin.cookie);await pageRedirect("/recruteur/dashboard",promotedLogin.cookie,"/recruteur/en-attente");
 await call(`/api/admin/users/${admin2.id}`,200,admin.cookie,"PATCH",{suspended:true});await call("/api/admin/recruteurs",401,admin2.cookie);
 console.log(`${checks} contrôles validation Recruteur réussis : migration non destructive, inscription, permissions, décisions concurrentes, notifications, suspension et parcours existants.`);
 await writeFile(".artifacts/recruiter-verification-api.json",JSON.stringify({checks},null,2));
}finally{
 const ids=(await db.user.findMany({where:{email:{startsWith:prefix}},select:{id:true}})).map(user=>user.id);
 await db.adminAction.deleteMany({where:{adminId:{in:ids}}});
 await db.application.deleteMany({where:{OR:[{workerId:{in:ids}},{mission:{recruiterId:{in:ids}}}]}});await db.mission.deleteMany({where:{recruiterId:{in:ids}}});await db.user.deleteMany({where:{id:{in:ids}}});
 if(before){assert.deepEqual(await coreSnapshot(),before,"Real preexisting data and sessions preserved after fixture cleanup");console.log("Données et sessions préexistantes inchangées ; comptes temporaires supprimés.");}
 await db.$disconnect();
}
