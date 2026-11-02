import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import env from "@next/env";
import { realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(directory);
const marker = "[QuickJob seed v1] Jeu de démonstration installé.";
const password = "QuickJob-Test2026!";
const day = 86_400_000;
const email = (role, index) => `$qj.seed.${role}${String(index + 1).padStart(2, "0")}@example.com`;

// Pure data generation: importing this module never connects to the database.
export function buildSeedPlan(now = new Date()) {
  const today = Date.parse(`${now.toISOString().slice(0, 10)}T00:00:00Z`);
  const date = offset => new Date(today + offset * day);
  const cities = ["Tunis", "La Marsa", "Sousse", "Sfax", "Hammamet", "Nabeul", "Bizerte", "Monastir", "Ariana", "Ben Arous"];
  const jobs = [
    ["Serveur pour un brunch", "Restauration", "Service en salle, accueil client", 65],
    ["Accueil lors d’un salon", "Événementiel", "Accueil, organisation", 80],
    ["Inventaire en boutique", "Commerce", "Rigueur, gestion de stock", 60],
    ["Préparation de commandes", "Logistique", "Organisation, manutention légère", 70],
    ["Assistant de saisie", "Administration", "Bureautique, saisie informatique", 75],
    ["Installation d’un espace associatif", "Services", "Travail en équipe, installation", 85],
  ];
  const names = ["Ben Salah", "Trabelsi", "Mansouri", "Gharbi", "Ayari", "Jaziri", "Saidi", "Hamdi", "Bouzid", "Chaabane", "Khalfi", "Dridi", "Mejri", "Nasri", "Chebbi"];
  const firstNames = ["Amira", "Youssef", "Inès", "Aziz", "Meriem", "Ahmed", "Sarra", "Mehdi", "Nour", "Khalil", "Rania", "Anis", "Salma", "Omar", "Yasmine"];
  const recruiters = Array.from({ length: 8 }, (_, i) => ({
    email: email("recruteur", i), name: names[i], firstName: firstNames[i], role: "RECRUTEUR",
    phone: `+216 20 900 ${String(i + 1).padStart(3, "0")}`, city: cities[i], address: `${12 + i} avenue de la République, ${cities[i]}`,
    recruiterType: "COMPANY", companyName: ["Café Jasmin", "Atlas Événements", "Boutique Medina", "Cap Logistique", "Bureau Carthage", "Maison Nabeul", "Comptoir du Nord", "Sahel Services"][i],
    sector: jobs[i % jobs.length][1], bio: "Entreprise fictive de démonstration. Renforts ponctuels pour une équipe locale.",
    avatarUrl: "/images/recruiter-illustration-v2.png", createdAt: date(-45),
  }));
  const workers = Array.from({ length: 15 }, (_, i) => ({
    email: email("travailleur", i), name: names[i], firstName: firstNames[i], role: "TRAVAILLEUR",
    phone: `+216 50 900 ${String(i + 1).padStart(3, "0")}`, city: cities[i % cities.length], address: `${5 + i} rue des Oliviers, ${cities[i % cities.length]}`,
    bio: "Profil fictif de démonstration. Disponible pour des missions ponctuelles, ponctuel et motivé.",
    skills: jobs[i % jobs.length][2], experience: `${1 + i % 4} ans de missions en ${jobs[i % jobs.length][1].toLocaleLowerCase("fr")} et en relation client.`,
    languages: i % 2 ? "Arabe, Français, Anglais" : "Arabe, Français", avatarUrl: "/images/worker-illustration-v2.png", createdAt: date(-40),
  }));
  const missions = Array.from({ length: 30 }, (_, i) => {
    const [title, category, skills, pay] = jobs[i % jobs.length];
    const status = i < 6 ? "COMPLETED" : i < 10 ? "FULL" : i < 13 ? "CLOSED" : i < 15 ? "CANCELLED" : i === 15 ? "DRAFT" : i === 16 ? "IN_PROGRESS" : "PUBLISHED";
    return {
      recruiterIndex: i % 5, title: `${title} — ${cities[i % cities.length]} ${1 + Math.floor(i / 6)}`,
      description: `Mission fictive QuickJob : ${title.toLocaleLowerCase("fr")} à ${cities[i % cities.length]}. Accueil par le responsable, consignes sur place et pause prévue. Tenue soignée et ponctualité demandées.`,
      category, skills, experience: "Une première expérience est appréciée ; briefing prévu sur place.", city: cities[i % cities.length],
      address: `${20 + i} avenue Habib Bourguiba, ${cities[i % cities.length]}`, status,
      date: date(i < 6 ? i - 10 : i === 16 ? 0 : i + 1), startTime: "09:00", endTime: "14:00", pay: pay + (i % 3) * 5,
      capacity: status === "FULL" ? 1 : 3, createdAt: date(-20),
    };
  });
  // No applications on the draft; additional applicants go to published missions.
  const applications = Array.from({ length: 40 }, (_, i) => {
    const missionIndex = i < 29 ? (i < 15 ? i : i + 1) : 17 + (i - 29);
    const mission = missions[missionIndex];
    const status = ["COMPLETED", "FULL", "IN_PROGRESS"].includes(mission.status) ? "ACCEPTED"
      : mission.status === "CANCELLED" ? "CANCELLED"
      : mission.status === "CLOSED" ? "REJECTED"
      : ["PENDING", "ACCEPTED", "REJECTED", "CANCELLED"][i % 4];
    return { missionIndex, workerIndex: i % 15, status, message: "Bonjour, mon expérience correspond à votre besoin. Je suis disponible sur le créneau proposé.", createdAt: date(-15) };
  });
  return { recruiters, workers, missions, applications, today };
}

async function seed() {
  if (process.env.NODE_ENV && process.env.NODE_ENV !== "development") throw new Error("Seed réservé à NODE_ENV=development (ou non défini).");
  env.loadEnvConfig(root, true);
  if (process.env.NODE_ENV && process.env.NODE_ENV !== "development") throw new Error("Environnement non autorisé.");
  if (process.env.CI || process.env.VERCEL || process.env.VERCEL_ENV) throw new Error("Seed interdit en CI et sur un déploiement.");
  // Only this project's existing development file is allowed. Reject URL options,
  // other databases and symlinks before constructing PrismaClient.
  if (process.env.DATABASE_URL !== "file:./dev.db") throw new Error("DATABASE_URL doit être exactement file:./dev.db (prisma/dev.db).");
  const expected = path.join(directory, "dev.db");
  if (await realpath(expected) !== expected) throw new Error("La base de développement ne doit pas être un lien symbolique.");
  const db = new PrismaClient({ datasources: { db: { url: `file:${expected.replaceAll("\\", "/")}` } } });
  try {
    const plan = buildSeedPlan();
    const hashedPassword = await bcrypt.hash(password, 12);
    const result = await db.$transaction(async tx => {
      const owner = await tx.user.findUnique({ where: { email: plan.recruiters[0].email } });
      if (owner && await tx.notification.findFirst({ where: { userId: owner.id, message: marker } })) return "déjà installé : aucune donnée modifiée";
      const reserved = [...plan.recruiters, ...plan.workers].map(user => user.email);
      if (await tx.user.count({ where: { email: { in: reserved } } })) throw new Error("Un email réservé au seed existe sans marqueur complet. Aucune donnée modifiée.");
      const recruiters = [], workers = [], missions = [];
      for (const data of plan.recruiters) recruiters.push(await tx.user.create({ data: { ...data, password: hashedPassword } }));
      for (const data of plan.workers) workers.push(await tx.user.create({ data: { ...data, password: hashedPassword } }));
      for (const [i, user] of recruiters.entries()) {
        await tx.recruiterVerification.create({ data: { userId: user.id, status: i < 5 ? "APPROUVE" : "EN_ATTENTE", requestedAt: user.createdAt, decidedAt: i < 5 ? new Date(plan.today - 30 * day) : null } });
        await tx.notification.create({ data: { userId: user.id, verificationId: user.id, message: i < 5 ? "Votre compte recruteur a été approuvé. Vous pouvez publier vos missions." : "Votre demande de vérification est en attente de traitement." } });
      }
      for (const name of new Set(plan.missions.map(m => m.category))) {
        const key = name.normalize("NFKD").replace(/\p{M}/gu, "").trim().replace(/\s+/g, " ").toLocaleLowerCase("fr");
        await tx.category.upsert({ where: { key }, update: {}, create: { key, name } });
      }
      for (const { recruiterIndex, ...data } of plan.missions) missions.push(await tx.mission.create({ data: { ...data, recruiterId: recruiters[recruiterIndex].id } }));
      for (const [i, { missionIndex, workerIndex, ...data }] of plan.applications.entries()) {
        const mission = missions[missionIndex], worker = workers[workerIndex];
        const application = await tx.application.create({ data: { ...data, missionId: mission.id, workerId: worker.id } });
        await tx.notification.create({ data: { userId: worker.id, message: `Votre candidature pour « ${mission.title} » : ${data.status}.`, readAt: i % 3 === 0 ? new Date() : null } });
        await tx.notification.create({ data: { userId: mission.recruiterId, message: `Candidature de ${worker.firstName} ${worker.name} pour « ${mission.title} ».`, readAt: i % 2 ? new Date() : null } });
        if (data.status === "ACCEPTED") {
          await tx.message.createMany({ data: [
            { applicationId: application.id, senderId: mission.recruiterId, body: "Bonjour, votre candidature est retenue. Rendez-vous à l’adresse indiquée, dix minutes avant le début.", createdAt: new Date(plan.today - 12 * day), readAt: new Date(plan.today - 11 * day) },
            { applicationId: application.id, senderId: worker.id, body: "Merci pour votre confiance ! Je confirme ma présence. Faut-il prévoir une tenue particulière ?", createdAt: new Date(plan.today - 11 * day), readAt: null },
          ] });
          // Leave two completed missions without reviews to test submitting them.
          if (mission.status === "COMPLETED" && missionIndex < 4) {
            await tx.review.createMany({ data: [
              { missionId: mission.id, authorId: mission.recruiterId, recipientId: worker.id, rating: 4 + i % 2, comment: "Ponctuel et impliqué, la mission s’est très bien déroulée." },
              { missionId: mission.id, authorId: worker.id, recipientId: mission.recruiterId, rating: 5, comment: "Équipe accueillante et consignes claires. Une bonne expérience." },
            ] });
          }
        }
      }
      for (const [i, worker] of workers.entries()) {
        await tx.favorite.create({ data: { workerId: worker.id, missionId: missions[17 + i % 13].id } });
        await tx.availability.createMany({ data: [
          { workerId: worker.id, startAt: new Date(plan.today + (i + 2) * day + 15 * 3_600_000), endAt: new Date(plan.today + (i + 2) * day + 18 * 3_600_000), kind: "AVAILABLE", note: "Disponible en fin de journée (heure tunisienne)." },
          { workerId: worker.id, startAt: new Date(plan.today + 35 * day + 8 * 3_600_000), endAt: new Date(plan.today + 35 * day + 12 * 3_600_000), kind: "UNAVAILABLE", note: "Cours ou rendez-vous personnel." },
        ] });
      }
      // Written last in the same transaction: reruns preserve all test edits.
      await tx.notification.create({ data: { userId: recruiters[0].id, message: marker, readAt: new Date() } });
      return "installé : 8 recruteurs, 15 travailleurs, 30 missions, 40 candidatures, messages, notifications, avis, favoris et disponibilités";
    }, { timeout: 60_000 });
    console.log(`Seed ${result}.`);
    console.log(`Comptes : qj.seed.recruteur01@example.com à qj.seed.recruteur08@example.com ; qj.seed.travailleur01@example.com à qj.seed.travailleur15@example.com. Mot de passe : ${password}`);
  } finally {
    await db.$disconnect();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  seed().catch(error => { console.error(error.message); process.exitCode = 1; });
}
