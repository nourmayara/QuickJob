import { z } from "zod";

export const missionStatuses = { DRAFT: "Brouillon", PUBLISHED: "Publiée", FULL: "Complète", IN_PROGRESS: "En cours", CLOSED: "Clôturée", COMPLETED: "Terminée", CANCELLED: "Annulée", MODERATED: "Masquée" } as const;
export const applicationStatuses = { PENDING: "En attente", ACCEPTED: "Acceptée", REJECTED: "Refusée" } as const;
export const categories = ["Restauration", "Événementiel", "Commerce", "Logistique", "Administration", "Services", "Autre"];
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide").refine(v => !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v, "Date invalide");
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horaire invalide");
export const missionFields = z.object({
  title: z.string().trim().min(3, "Le titre doit contenir au moins 3 caractères").max(160),
  description: z.string().trim().min(10, "Décrivez la mission en au moins 10 caractères").max(10000),
  category: z.string().trim().min(1, "Choisissez une catégorie").max(100),
  city: z.string().trim().min(1, "Ville requise").max(100),
  address: z.string().trim().min(3, "Adresse requise").max(250),
  date, startTime: time, endTime: time,
  pay: z.number().finite().min(0, "Rémunération invalide").max(1000000),
  capacity: z.number().int().min(1, "Une place minimum").max(1000),
  skills: z.string().trim().max(1000),
  experience: z.string().trim().max(2000).optional(),
}).strict();
export const missionFormSchema = missionFields.extend({ status: z.enum(["DRAFT", "PUBLISHED"]).default("PUBLISHED") }).superRefine((v, ctx) => {
  if (v.endTime <= v.startTime) ctx.addIssue({ code: "custom", path: ["endTime"], message: "L’heure de fin doit suivre l’heure de début (même journée)" });
});
// Legacy clients may still send title + description only.
export const missionCreateSchema = missionFields.partial().required({ title: true, description: true }).extend({ status: z.enum(["DRAFT", "PUBLISHED"]).optional() }).strict();
export const missionPatchSchema = missionFields.partial().extend({ status: z.enum(["DRAFT", "PUBLISHED", "CLOSED", "CANCELLED", "IN_PROGRESS", "COMPLETED"]).optional() }).strict().refine(v => Object.keys(v).length > 0);
export const recruiterProfileSchema = z.object({
  name: z.string().trim().min(2).max(80), firstName: z.string().trim().min(1).max(80),
  companyName: z.string().trim().max(160), sector: z.string().trim().max(100), bio: z.string().trim().max(3000),
  city: z.string().trim().max(100), phone: z.string().trim().regex(/^\+?[\d\s().-]{8,20}$/, "Téléphone invalide"),
  avatarUrl: z.string().trim().max(500).refine(v => !v || /^\/images\/[a-zA-Z0-9/_ .-]+\.(png|jpe?g|webp)$/i.test(v), "Utilisez le chemin d’une image locale /images/…"),
}).strict();
