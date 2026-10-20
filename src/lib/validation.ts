import { z } from "zod";

export const registerSchema = z.object({
  role: z.enum(["TRAVAILLEUR", "RECRUTEUR"]).default("TRAVAILLEUR"),
  firstName: z.string().trim().min(1, "Prénom requis").max(80),
  phone: z.string().trim().regex(/^\+?[\d\s().-]{8,20}$/, "Téléphone invalide"),
  city: z.string().trim().max(100).optional(),
  recruiterType: z.enum(["INDIVIDUAL", "COMPANY"]).optional(),
  companyName: z.string().trim().max(160).optional(),
  confirmPassword: z.string(),
  acceptTerms: z.literal(true, { error: "Veuillez accepter les conditions d’utilisation" }),
  name: z.string().trim().min(2, "Nom : 2 caractères minimum").max(80, "Nom : 80 caractères maximum"),
  email: z.string().trim().toLowerCase().email("Email invalide"),
  password: z.string().min(8, "Mot de passe : 8 caractères minimum").refine(value => new TextEncoder().encode(value).length <= 72, "Mot de passe : 72 octets maximum"),
}).superRefine((data, ctx) => {
  if (data.confirmPassword !== undefined && data.confirmPassword !== data.password)
    ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "Les mots de passe ne correspondent pas" });
  if (data.role === "RECRUTEUR" && !data.recruiterType)
    ctx.addIssue({ code: "custom", path: ["recruiterType"], message: "Choisissez votre type de recruteur" });
  if (data.recruiterType === "COMPANY" && !data.companyName)
    ctx.addIssue({ code: "custom", path: ["companyName"], message: "Nom de l’entreprise requis" });
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

export const RegisterSchema = registerSchema;
export type RegisterInput =
  z.infer<typeof RegisterSchema>;
