import { z } from "zod";
import { profileImageSchema } from "./profile-validation";

export const workerProfileSchema = z.object({
  name: z.string().trim().min(2, "Renseignez votre nom (2 caractères minimum)").max(80).optional(),
  firstName: z.string().trim().min(1, "Renseignez votre prénom").max(80).optional(),
  avatarUrl: profileImageSchema.optional(),
  city: z.string().trim().min(1, "Renseignez votre ville").max(100),
  skills: z.string().trim().min(1, "Renseignez vos compétences").max(1000),
  experience: z.string().trim().max(5000, "Les expériences sont limitées à 5 000 caractères"),
  languages: z.string().trim().min(1, "Renseignez les langues que vous parlez").max(1000),
  bio: z.string().trim().max(3000),
  recommendationOptIn: z.boolean().optional(),
}).strict();
export const selectedSkillSchema = z.object({
  name: z.string().trim().min(2).max(60),
  evidence: z.string().trim().max(180).optional(),
  source: z.enum(["manual", "llm", "rule-based", "structured"]),
}).strict();
export const workerProfileUpdateSchema = workerProfileSchema.extend({ selectedSkills: z.array(selectedSkillSchema).max(30) });
export const skillAnalysisSchema = z.object({ experience: z.string().trim().min(20, "Décrivez un peu plus précisément votre expérience avant l’analyse.").max(5000) }).strict();
export const applicationInput = z.object({ message: z.string().trim().max(2000, "Le message est limité à 2 000 caractères").optional() }).strict();

const optionalAmount = z.preprocess(v => v === "" ? undefined : v, z.coerce.number().finite().min(0, "Le montant doit être positif").max(1000000).optional());
export const workerSearchSchema = z.object({
  q: z.string().trim().max(160).default(""),
  category: z.string().trim().max(100).default(""),
  city: z.string().trim().max(100).default(""),
  date: z.string().default("").refine(v => !v || /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v, "Date invalide"),
  payMin: optionalAmount, payMax: optionalAmount,
  page: z.coerce.number().int().min(1).max(100000).default(1),
}).refine(v => v.payMin === undefined || v.payMax === undefined || v.payMax >= v.payMin, "La rémunération maximale doit être supérieure ou égale au minimum");
export type WorkerSearch = z.infer<typeof workerSearchSchema>;
