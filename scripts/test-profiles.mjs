import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const db = new PrismaClient();
const base = process.env.TEST_BASE_URL || 'http://localhost:3100';
const ids = [];
let checks = 0;
async function request(path, status, actor, method = 'GET', body) {
  const response = await fetch(base + path, { method, redirect: 'manual', headers: { ...(actor ? { Cookie: actor.cookie } : {}), 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  assert.equal(response.status, status, `${method} ${path}: ${await response.clone().text()}`);
  checks++;
  return response;
}
async function account(role) {
  const response = await request('/api/auth/register', 201, null, 'POST', { name: 'Profil', firstName: 'Test', email: `profiles-${Date.now()}-${role}@example.invalid`, phone: '+216 12345678', password: 'test-password123', confirmPassword: 'test-password123', acceptTerms: true, role, ...(role === 'RECRUTEUR' ? { recruiterType: 'INDIVIDUAL' } : {}) });
  const actor = { ...await response.json(), cookie: response.headers.get('set-cookie').split(';')[0] };
  ids.push(actor.id); return actor;
}
try {
  const worker = await account('TRAVAILLEUR'), recruiter = await account('RECRUTEUR');
  await request('/api/recruteur/profil', 403, recruiter);
  await db.recruiterVerification.update({ where: { userId: recruiter.id }, data: { status: 'APPROUVE' } });
  const verification = await db.recruiterVerification.findUnique({ where: { userId: recruiter.id } });
  const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=';
  const profiles = [
    [worker, recruiter, '/api/travailleur/profil', '/dashboard/travailleur/profil', { name: 'Martin', firstName: 'Amira', city: 'Tunis', skills: 'Accueil', experience: 'Deux ans en accueil', languages: 'Français, arabe', bio: 'Disponible', avatarUrl: image }],
    [recruiter, worker, '/api/recruteur/profil', '/recruteur/profil', { name: 'Durand', firstName: 'Sarah', companyName: 'Organisation test', sector: 'Services', bio: 'Notre activité', city: 'Tunis', address: '10 rue des Fleurs', phone: '+216 12345678', avatarUrl: image }],
  ];
  for (const [actor, other, api, page, profile] of profiles) {
    await request(api, 401);
    await request(api, 401, null, 'PATCH', profile);
    await request(api, 403, other, 'PATCH', profile);
    for (const bio of ['Présentation initiale', 'Présentation modifiée']) {
      await request(api, 200, actor, 'PATCH', { ...profile, bio });
      const stored = await (await request(api, 200, actor)).json();
      for (const [key, value] of Object.entries({ ...profile, bio })) assert.equal(stored[key], value);
      assert.ok(!('password' in stored) && !('sessions' in stored));
      const html = await (await request(page, 200, actor)).text();
      assert.ok(html.includes(profile.name) && html.includes(bio));
    }
    for (const invalid of [{ role: 'ADMIN' }, { id: other.id }, { avatarUrl: 'javascript:alert(1)' }, { avatarUrl: 'data:image/svg+xml;base64,PHN2Zz4=' }, { name: '' }, { bio: 'x'.repeat(3001) }]) await request(api, 400, actor, 'PATCH', { ...profile, ...invalid });
    if (actor === recruiter) for (const invalid of [{ phone: 'abcdefgh' }, { address: '' }, { sector: '' }]) await request(api, 400, actor, 'PATCH', { ...profile, ...invalid });
    await request(api, 200, actor, 'PATCH', { ...profile, avatarUrl: '' });
    assert.equal((await (await request(api, 200, actor)).json()).avatarUrl, '');
  }
  const mission = await db.mission.create({ data: { title: 'Profil test', description: 'Test de visibilité du profil', recruiterId: recruiter.id } });
  const application = await db.application.create({ data: { workerId: worker.id, missionId: mission.id } });
  const html = await (await request(`/recruteur/candidatures/${application.id}`, 200, recruiter)).text();
  for (const value of ['Amira', 'Martin', 'Deux ans en accueil', 'Français, arabe', 'Accueil']) assert.ok(html.includes(value));
  assert.deepEqual(await db.recruiterVerification.findUnique({ where: { userId: recruiter.id } }), verification);
  console.log(`${checks} contrôles profils réussis : persistance, rechargement, validation, rôles, visibilité et approbation conservée.`);
} finally {
  await db.application.deleteMany({ where: { workerId: { in: ids } } });
  await db.mission.deleteMany({ where: { recruiterId: { in: ids } } });
  await db.user.deleteMany({ where: { id: { in: ids } } });
  await db.$disconnect();
}
