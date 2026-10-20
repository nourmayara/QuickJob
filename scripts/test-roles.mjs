import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const prisma = new PrismaClient();
const base = process.env.TEST_BASE_URL ?? "http://localhost:3100";
const prefix = `roles-${Date.now()}-`;
const users = [];
const missions = [];
let checks = 0;
function clean(value) {
  if (!value || typeof value !== "object") return;
  for(const [key, child] of Object.entries(value)) {
    assert.ok(!/password|token|secret|sessionId/i.test(key),`Champ sensible: ${key}`);
    clean(child);
  }
}
async function req(route, method="GET", body, cookie="") {
  const response = await fetch(base+route,{method,redirect:"manual",headers:{...(body !== undefined ? {"Content-Type":"application/json"}:{}),...(cookie ? {Cookie:cookie}:{})},body:body === undefined ? undefined : JSON.stringify(body)});
  if(response.headers.get("content-type")?.includes("application/json")) clean(await response.clone().json());
  return response;
}
async function status(route, expected, method="GET", body, cookie="") {const r=await req(route,method,body,cookie);assert.equal(r.status,expected,`${method} ${route}: ${await r.clone().text()}`);checks++;return r;}
const payload = (suffix, role) => ({name:"Test roles",firstName:"Alice",phone:"+216 12345678",email:prefix+suffix+"@example.invalid",password:"motdepasse123",confirmPassword:"motdepasse123",acceptTerms:true,role,...(role === "RECRUTEUR" ? {recruiterType:"INDIVIDUAL"}:{})});
async function register(suffix,role) {
  const r=await status("/api/auth/register",201,"POST",payload(suffix,role));
  const user=await r.json(); const actor={...user,cookie:r.headers.get("set-cookie").split(";")[0]};users.push(actor);return actor;
}
async function mission(actor) {
  const r=await status("/api/missions",201,"POST",{title:"Mission test",description:"Description de la mission de test"},actor.cookie);
  const result=await r.json();missions.push(result.id);return result;
}
try {
  for(const route of ["/api/auth/me","/api/missions","/api/applications","/api/admin/users"]) await status(route,401);
  await status("/api/missions",401,"POST",{});
  for(const role of ["ADMIN","WORKER","RECRUITER","inconnu"]) await status("/api/auth/register",400,"POST",payload("forbidden",role));
  const wa=await register("wa","TRAVAILLEUR"), wb=await register("wb","TRAVAILLEUR"), ra=await register("ra","RECRUTEUR"), rb=await register("rb","RECRUTEUR");
  const admin=await register("admin","TRAVAILLEUR");
  await prisma.user.update({where:{id:admin.id},data:{role:"ADMIN"}});
  await status("/dashboard/travailleur",200,"GET",undefined,wa.cookie);
  await status("/dashboard/recruteur",307,"GET",undefined,wa.cookie);
  await status("/dashboard/administrateur",307,"GET",undefined,ra.cookie);
  await status("/api/missions",403,"POST",{},wa.cookie);
  await status("/api/missions",403,"POST",{},admin.cookie);
  await status("/api/profile",200,"GET",undefined,wa.cookie);
  await status("/api/profile",400,"PATCH",{role:"ADMIN"},wa.cookie);
  await status("/api/profile",400,"PATCH",{id:wb.id,name:"Attaque"},wa.cookie);
  await status("/api/profile",200,"PATCH",{city:"Tunis"},wa.cookie);
  const ma=await mission(ra), mb=await mission(rb);
  await status(`/api/missions/${mb.id}`,404,"PATCH",{title:"Attaque"},ra.cookie);
  await status(`/api/missions/${ma.id}`,400,"PATCH",{recruiterId:rb.id},ra.cookie);
  await status(`/api/missions/${ma.id}`,200,"PATCH",{title:"Titre modifié"},ra.cookie);
  const application=await (await status(`/api/missions/${ma.id}/applications`,201,"POST",{},wa.cookie)).json();
  await status(`/api/missions/${ma.id}/applications`,409,"POST",{},wa.cookie);
  await status(`/api/applications/${application.id}`,404,"GET",undefined,wb.cookie);
  await status(`/api/applications?workerId=${wa.id}`,403,"GET",undefined,wb.cookie);
  await status(`/api/applications/${application.id}`,404,"PATCH",{status:"ACCEPTED"},rb.cookie);
  await status(`/api/applications/${application.id}`,200,"PATCH",{status:"ACCEPTED"},ra.cookie);
  await status(`/api/missions/${ma.id}/applications`,404,"GET",undefined,rb.cookie);
  await status("/api/admin/users",403,"GET",undefined,ra.cookie);
  await status("/dashboard/administrateur",200,"GET",undefined,admin.cookie);
  await status("/api/admin/users",200,"GET",undefined,admin.cookie);
  await status("/api/admin/statistics",200,"GET",undefined,admin.cookie);
  await status("/api/admin/missions",200,"GET",undefined,admin.cookie);
  await status(`/api/admin/users/${wb.id}`,400,"PATCH",{role:"ADMIN"},admin.cookie);
  await status(`/api/admin/users/${wb.id}`,200,"PATCH",{suspended:true},admin.cookie);
  await status("/api/auth/me",401,"GET",undefined,wb.cookie);
  await status("/api/auth/login",401,"POST",{email:wb.email,password:"motdepasse123"});
  await status(`/api/admin/users/${wb.id}`,200,"PATCH",{suspended:false},admin.cookie);
  await status("/api/auth/me",401,"GET",undefined,wb.cookie);
  await status(`/api/admin/missions/${ma.id}`,200,"PATCH",{action:"MODERATE"},admin.cookie);
  await status(`/api/missions/${ma.id}`,404,"PATCH",{status:"PUBLISHED"},ra.cookie);
  await status(`/api/missions/${ma.id}/applications`,404,"POST",{},wa.cookie);
  await status("/api/auth/logout",200,"POST",undefined,wa.cookie);
  await status("/api/auth/me",401,"GET",undefined,wa.cookie);
  await status("/dashboard/travailleur",307,"GET",undefined,wa.cookie);
  const login=await status("/api/auth/login",200,"POST",{email:wa.email,password:"motdepasse123"});
  assert.equal((await login.json()).role,"TRAVAILLEUR");
  const legacy=await new SignJWT({userId:wa.id,role:"ADMIN"}).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime("1h").sign(new TextEncoder().encode(process.env.JWT_SECRET));
  const legacyCookie="session="+legacy;
  await status("/api/auth/me",200,"GET",undefined,legacyCookie);
  await status("/api/admin/users",403,"GET",undefined,legacyCookie);
  await status("/api/auth/logout",200,"POST",undefined,legacyCookie);
  await status("/api/auth/me",401,"GET",undefined,legacyCookie);
  await status("/api/auth/me",401,"GET",undefined,"session=invalid");
  console.log(`${checks} contrôles réussis, incluant les 10 scénarios demandés et la non-divulgation des secrets sur chaque réponse JSON.`);
} finally {
  const ids=users.map(u=>u.id);
  await prisma.application.deleteMany({where:{OR:[{workerId:{in:ids}},{missionId:{in:missions}}]}});
  await prisma.mission.deleteMany({where:{id:{in:missions}}});
  await prisma.user.deleteMany({where:{email:{startsWith:prefix}}});
  await prisma.$disconnect();
}
