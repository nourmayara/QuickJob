import { z } from "zod";
import { missionStatuses } from "./recruiter-validation";
export const reportStatuses = ["NOUVEAU", "EN_COURS", "RESOLU", "REJETE"] as const;
export const listInput = z.object({ q: z.string().trim().max(160).default(""), page: z.coerce.number().int().min(1).max(100000).default(1) });
export const usersFilter = listInput.extend({ role: z.enum(["", "TRAVAILLEUR", "RECRUTEUR", "ADMIN"]).default(""), status: z.enum(["", "ACTIF", "SUSPENDU"]).default("") });
export const missionsFilter = listInput.extend({ status: z.string().refine(s => !s || Object.hasOwn(missionStatuses, s), "Statut invalide").default("") });
export const reportsFilter = listInput.extend({ status: z.enum(["", ...reportStatuses]).default("") });
export const categoryInput = z.object({ name: z.string().trim().min(2).max(100), active: z.boolean().default(true) }).strict();
export const reportInput = z.object({ kind: z.enum(["MISSION", "PROFILE", "BEHAVIOR"]), missionId: z.number().int().positive().optional(), targetUserId: z.number().int().positive().optional(), reason: z.string().trim().min(10, "Expliquez le problème en au moins 10 caractères").max(3000) }).strict().superRefine((v, ctx) => {
  if (v.kind === "MISSION" ? !v.missionId || !!v.targetUserId : !v.targetUserId || (v.kind === "PROFILE" && !!v.missionId)) ctx.addIssue({ code: "custom", message: "Cible du signalement invalide" });
});
export const reportDecisionInput = z.object({ status: z.enum(["EN_COURS", "RESOLU", "REJETE"]), expectedStatus: z.enum(reportStatuses), resolution: z.string().trim().max(2000).default("") }).strict().refine(v => v.status === "EN_COURS" || v.resolution.length >= 10, "Expliquez la décision en au moins 10 caractères");
