import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const prisma = new PrismaClient();
const base = process.env.TEST_BASE_URL ?? "http://localhost:3100";
const email = `tp-test-${Date.now()}@example.com`;
let cookie = "";
async function request(path, method = "GET", body, authenticated = false) {
  if (path === "/api/auth/register" && body) body = { firstName: "Alice", phone: "+216 12345678", confirmPassword: body.password, acceptTerms: true, ...body };
  return fetch(base + path, { method, redirect: "manual", headers: { ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...(authenticated ? { Cookie: cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
}
try {
  for (const path of ["/", "/login", "/register"]) assert.equal((await request(path)).status, 200);
  assert.equal((await request("/dashboard")).status, 307);
  assert.equal((await request("/api/auth/me")).status, 401);
  assert.equal((await request("/api/auth/register", "POST", { name: "A", email, password: "court" })).status, 400);
  const malformed = await fetch(base + "/api/auth/login", { method: "POST", body: "{" });
  assert.equal(malformed.status, 400);
  const registered = await request("/api/auth/register", "POST", { name: "  Alice  ", email: email.toUpperCase(), password: "motdepasse123" });
  assert.equal(registered.status, 201);
  const header = registered.headers.get("set-cookie");
  assert.match(header, /HttpOnly/i); assert.match(header, /SameSite=lax/i); assert.match(header, /Max-Age=604800/i);
  cookie = header.split(";")[0];
  const user = await registered.json();
  assert.equal(user.name, "Alice"); assert.equal(user.email, email); assert.equal("password" in user, false);
  const stored = await prisma.user.findUniqueOrThrow({ where: { email } });
  assert.notEqual(stored.password, "motdepasse123"); assert.equal(await bcrypt.compare("motdepasse123", stored.password), true);
  const me = await request("/api/auth/me", "GET", undefined, true); assert.equal(me.status, 200); assert.equal("password" in await me.json(), false);
  const roleRedirect = await request("/dashboard", "GET", undefined, true);
  assert.equal(roleRedirect.status, 307); assert.match(roleRedirect.headers.get("location"), /dashboard\/travailleur/);
  assert.equal((await request("/dashboard/travailleur", "GET", undefined, true)).status, 200);
  assert.equal((await request("/dashboard/administrateur", "GET", undefined, true)).status, 307);
  const loginPage = await request("/login", "GET", undefined, true); assert.equal(loginPage.status, 307); assert.match(loginPage.headers.get("location"), /dashboard/);
  assert.equal((await request("/api/auth/register", "POST", { name: "Alice", email, password: "motdepasse123" })).status, 409);
  const wrong = await request("/api/auth/login", "POST", { email, password: "faux" });
  const unknown = await request("/api/auth/login", "POST", { email: "absent-" + email, password: "faux" });
  assert.equal(wrong.status, 401); assert.equal(unknown.status, 401); assert.deepEqual(await wrong.json(), await unknown.json());
  const logout = await request("/api/auth/logout", "POST", undefined, true); assert.equal(logout.status, 200); assert.match(logout.headers.get("set-cookie"), /Expires=Thu, 01 Jan 1970/i);
  assert.equal((await request("/api/auth/me")).status, 401);
  const login = await request("/api/auth/login", "POST", { email: email.toUpperCase(), password: "motdepasse123" }); assert.equal(login.status, 200);
  assert.equal((await login.clone().json()).role, "TRAVAILLEUR");
  for (const override of [{ role: "ADMIN" }, { confirmPassword: "different" }, { acceptTerms: false }, { role: "RECRUTEUR", recruiterType: "COMPANY", companyName: "" }]) {
    assert.equal((await request("/api/auth/register", "POST", { name: "Alice", email: "invalid-" + email, password: "motdepasse123", ...override })).status, 400);
  }
  for (const [role, path] of [["RECRUTEUR", "/recruteur/dashboard"], ["ADMIN", "/dashboard/administrateur"]]) {
    await prisma.user.update({ where: { email }, data: { role } });
    const roleLogin = await request("/api/auth/login", "POST", { email, password: "motdepasse123" });
    assert.equal((await roleLogin.json()).role, role);
    cookie = roleLogin.headers.get("set-cookie").split(";")[0];
    assert.equal((await request(path, "GET", undefined, true)).status, 200);
    assert.equal((await request("/dashboard/travailleur", "GET", undefined, true)).status, 307);
  }
  await prisma.user.delete({ where: { email } });
  const recruiter = await request("/api/auth/register", "POST", { name: "Entreprise", email, password: "motdepasse123", role: "RECRUTEUR", recruiterType: "COMPANY", companyName: "QuickJob test" });
  assert.equal(recruiter.status, 201); assert.equal((await recruiter.json()).role, "RECRUTEUR");
  assert.equal((await prisma.user.findUniqueOrThrow({ where: { email } })).companyName, "QuickJob test");
  cookie = "session=invalid"; assert.equal((await request("/api/auth/me", "GET", undefined, true)).status, 401);
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);
  const expired = await new SignJWT({ userId: user.id }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("1 second ago").sign(secret);
  cookie = "session=" + expired; assert.equal((await request("/api/auth/me", "GET", undefined, true)).status, 401);
  cookie = login.headers.get("set-cookie").split(";")[0];
  await prisma.user.delete({ where: { email } });
  assert.equal((await request("/api/auth/me", "GET", undefined, true)).status, 401);
  const dashboard = await request("/dashboard", "GET", undefined, true); assert.equal(dashboard.status, 307); assert.match(dashboard.headers.get("location"), /session-expired/);
  console.log("Recette réussie : validation, inscription, hash, doublon, connexion, cookies, redirections, déconnexion, JWT invalide/expiré et compte supprimé.");
} finally {
  await prisma.user.deleteMany({ where: { email } });
  await prisma.$disconnect();
}
