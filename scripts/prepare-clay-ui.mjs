import { DatabaseSync } from "node:sqlite";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
await mkdir(".artifacts", { recursive: true });
const databaseFile = path.resolve(`.artifacts/quickjob-clay-ui-${Date.now()}.db`);
const sqlite = new DatabaseSync(databaseFile);
try { for (const dir of (await readdir("prisma/migrations")).filter(n => /^\d/.test(n)).sort()) sqlite.exec(await readFile(`prisma/migrations/${dir}/migration.sql`, "utf8")); }
finally { sqlite.close(); }
const databaseUrl = `file:${databaseFile.replaceAll("\\", "/")}`;
const db = new PrismaClient({ datasourceUrl: databaseUrl });
const password = "Visual-check123!";
try {
  const hash = await bcrypt.hash(password, 10), actors = {};
  for (const [name, role] of [["worker", "TRAVAILLEUR"], ["recruiter", "RECRUTEUR"], ["admin", "ADMIN"], ["pending", "RECRUTEUR"], ["refused", "RECRUTEUR"]]) {
    const user = await db.user.create({ data: { name: name === "worker" ? "Ben Ali" : "Martin", firstName: name === "worker" ? "Amira" : name === "admin" ? "Sarah" : "Nadia", email: `${name}@clay-ui.example.invalid`, password: hash, role, phone: "+216 12345678", city: "Tunis", companyName: role === "RECRUTEUR" ? "Maison des possibles" : null, sector: "Événementiel", bio: "Des missions et des rencontres qui font avancer.", skills: "Accueil, service, organisation", languages: "Français, arabe, anglais", experience: "Deux ans en accueil et en coordination.", ...(role === "RECRUTEUR" ? { recruiterVerification: { create: { status: name === "pending" ? "EN_ATTENTE" : name === "refused" ? "REFUSE" : "APPROUVE", refusalReason: name === "refused" ? "Merci de compléter les informations de votre organisation." : null } } } : {}) } });
    actors[name] = { id: user.id, email: user.email, password };
  }
  const next = new Date(); next.setUTCMonth(next.getUTCMonth() + 1, 1);
  const month = next.toISOString().slice(0, 7), recruiterId = actors.recruiter.id, workerId = actors.worker.id;
  const shared = { description: "Accueillez les visiteurs et accompagnez une équipe attentive pendant un événement à Tunis.", category: "Événementiel", city: "Tunis", address: "12 avenue de la Liberté", startTime: "09:00", endTime: "17:00", pay: 90, capacity: 3, skills: "Accueil, sens du contact", experience: "Une première expérience en événementiel appréciée.", recruiterId };
  const accepted = await db.mission.create({ data: { ...shared, title: "Accueil pour un événement culturel", date: new Date(`${month}-20T00:00:00Z`), status: "PUBLISHED" } });
  const pending = await db.mission.create({ data: { ...shared, title: "Renfort en boutique de créateurs", category: "Commerce", pay: 75, date: new Date(`${month}-21T00:00:00Z`), status: "PUBLISHED" } });
  const available = await db.mission.create({ data: { ...shared, title: "Une journée au cœur d’une belle équipe", category: "Services", pay: 85, date: new Date(`${month}-22T00:00:00Z`), status: "PUBLISHED" } });
  const completed = await db.mission.create({ data: { ...shared, title: "Service lors d’une rencontre professionnelle", date: new Date("2020-01-15T00:00:00Z"), status: "COMPLETED", pay: 120.5 } });
  const application = await db.application.create({ data: { missionId: accepted.id, workerId, status: "ACCEPTED", message: "Disponible et ravie de rejoindre votre équipe pour cet événement." } });
  await db.application.create({ data: { missionId: pending.id, workerId, status: "PENDING", message: "Mon expérience en accueil sera utile à votre boutique." } });
  await db.application.create({ data: { missionId: completed.id, workerId, status: "ACCEPTED" } });
  await db.review.create({ data: { missionId: completed.id, authorId: recruiterId, recipientId: workerId, rating: 5, comment: "Une collaboration attentive et très professionnelle." } });
  await db.review.create({ data: { missionId: completed.id, authorId: workerId, recipientId: recruiterId, rating: 4, comment: "Une équipe accueillante, des consignes claires." } });
  for (const [day, kind] of [["19", "AVAILABLE"], ["23", "UNAVAILABLE"]]) await db.availability.create({ data: { workerId, kind, startAt: new Date(`${month}-${day}T08:00:00+01:00`), endAt: new Date(`${month}-${day}T18:00:00+01:00`), note: kind === "AVAILABLE" ? "Disponible pour une nouvelle mission" : "Engagement personnel" } });
  await db.favorite.create({ data: { workerId, missionId: available.id } });
  await db.notification.create({ data: { userId: workerId, message: "Votre candidature pour « Accueil pour un événement culturel » a été acceptée." } });
  await db.message.create({ data: { applicationId: application.id, senderId: recruiterId, body: "Bonjour Amira, nous sommes ravis de vous accueillir dans l’équipe. Rendez-vous à 9 h à l’entrée principale." } });
  await db.message.create({ data: { applicationId: application.id, senderId: workerId, body: "Merci Nadia ! À très bientôt, je serai à l’heure." } });
  const report = await db.report.create({ data: { kind: "MISSION", reason: "Des informations sur le lieu de la mission méritent une vérification.", authorId: workerId, missionId: available.id } });
  await writeFile(".artifacts/clay-ui-env.json", JSON.stringify({ databaseUrl, databaseFile, actors, month, applicationId: application.id, availableId: available.id, reportId: report.id }));
  console.log("Isolated UI database prepared. The live database was not opened for writing.");
} finally { await db.$disconnect(); }
