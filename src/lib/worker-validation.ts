import { z } from "zod";

export const workerProfileSchema = z.object({
  city: z.string().trim().min(1, "Renseignez votre ville").max(100),
  skills: z.string().trim().min(1, "Renseignez vos compétences").max(1000),
  experience: z.string().trim().max(5000, "Les expériences sont limitées à 5 000 caractères"),
  languages: z.string().trim().min(1, "Renseignez les langues que vous parlez").max(1000),
  bio: z.string().trim().max(3000),
}).strict();
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
