import { z } from "zod";
export const messageInput = z.object({ body: z.string().trim().min(1, "Écrivez un message").max(4000, "Le message est limité à 4 000 caractères") }).strict();
export const reviewInput = z.object({ rating: z.number().int().min(1).max(5), comment: z.string().trim().min(1, "Ajoutez un commentaire").max(2000) }).strict();
export const notificationReadInput = z.object({ id: z.number().int().positive().optional(), all: z.literal(true).optional() }).strict().refine(v => (v.id !== undefined) !== (v.all === true), "Choisissez une notification ou toutes les notifications");
