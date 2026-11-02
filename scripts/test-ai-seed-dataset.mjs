import { PrismaClient } from "@prisma/client";
import { scoreMatch } from "../src/lib/matching-score.ts";

const db = new PrismaClient();
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const interval = mission => ({
  startAt: new Date(`${mission.date.toISOString().slice(0, 10)}T${mission.startTime}:00Z`),
  endAt: new Date(`${mission.date.toISOString().slice(0, 10)}T${mission.endTime}:00Z`),
});

try {
  const [workers, recruiters, missions, applications, skills, experiences] = await Promise.all([
    db.user.count({ where: { role: "TRAVAILLEUR" } }),
    db.user.count({ where: { role: "RECRUTEUR" } }), db.mission.count(),
    db.application.count(), db.skill.count(), db.workExperience.count(),
  ]);
  assert(workers >= 60 && recruiters >= 15 && missions >= 120 && applications >= 200, "Les volumes cibles ne sont pas atteints.");
  assert(skills >= 40 && experiences >= 100, "Les compétences ou expériences cibles ne sont pas atteintes.");

  const replacementMission = await db.mission.findFirstOrThrow({ where: { title: "[AI-SCENARIO] Remplacement restauration" }, include: { applications: true, replacementOffers: true } });
  assert(replacementMission.status === "PUBLISHED", "La mission de remplacement doit être publiée.");
  assert(replacementMission.applications.some(item => item.status === "CANCELLED" && item.cancelledFromStatus === "ACCEPTED" && item.cancelledBy === "WORKER"), "Annulation travailleur absente.");
  assert(replacementMission.replacementOffers.some(item => item.status === "PENDING"), "Offre de remplacement en attente absente.");

  const conflict = await db.mission.findFirstOrThrow({ where: { title: "[AI-SCENARIO] Conflit horaire logistique" }, include: { applications: true } });
  const full = await db.mission.findFirstOrThrow({ where: { title: "[AI-SCENARIO] Mission complète" }, include: { applications: true } });
  const conflictWorker = conflict.applications.find(item => full.applications.some(other => other.workerId === item.workerId && other.status === "ACCEPTED"));
  assert(conflictWorker && conflict.date?.getTime() === full.date?.getTime() && conflict.startTime === full.startTime && conflict.endTime === full.endTime, "Le conflit horaire n'est pas réel.");
  assert(full.status === "FULL" && full.applications.filter(item => item.status === "ACCEPTED").length === full.capacity, "La mission complète n'a pas exactement sa capacité acceptée.");

  const scenarioWorker = await db.user.findUniqueOrThrow({ where: { id: replacementMission.applications.find(item => item.cancelledFromStatus === "ACCEPTED").workerId }, include: { workerSkills: { include: { skill: true } }, categoryPreferences: true, availabilities: true } });
  const scenario = async title => {
    const mission = await db.mission.findFirstOrThrow({ where: { title }, include: { requiredSkills: { include: { skill: true } } } });
    const times = interval(mission);
    return { mission, result: scoreMatch({ worker: { city: scenarioWorker.city, skillKeys: scenarioWorker.workerSkills.map(item => item.skill.key), preferredCategories: scenarioWorker.categoryPreferences.map(item => item.category), experienceMonths: 60, availabilities: scenarioWorker.availabilities }, mission: { city: mission.city, category: mission.category, requiredSkillKeys: mission.requiredSkills.map(item => item.skill.key), requiredExperienceMonths: mission.requiredExperienceMonths, ...times } }, { skills: .4, category: 0, location: .2, availability: .25, experience: .15 }) };
  };
  const excellent = await scenario("[AI-SCENARIO] Excellent matching");
  const partial = await scenario("[AI-SCENARIO] Matching partiel");
  const incompatible = await scenario("[AI-SCENARIO] Incompatibilité");
  assert(excellent.result.score === 100, `Excellent matching attendu 100, obtenu ${excellent.result.score}.`);
  assert(partial.result.score === 60, `Matching partiel attendu 60, obtenu ${partial.result.score}.`);
  const workerKeys = new Set(scenarioWorker.workerSkills.map(item => item.skill.key));
  assert(incompatible.mission.requiredSkills.some(item => item.required && !workerKeys.has(item.skill.key)), "Le scénario incompatible ne manque pas de compétence obligatoire.");

  console.log(JSON.stringify({ volumes: { workers, recruiters, missions, applications, skills, experiences }, scenarios: { excellent: excellent.result.score, partial: partial.result.score, incompatible: "exclu (compétence obligatoire)", conflict: "détectable", full: `${full.capacity}/${full.capacity}`, replacement: "offre PENDING après annulation" } }, null, 2));
} finally {
  await db.$disconnect();
}
