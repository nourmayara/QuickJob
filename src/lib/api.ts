import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireApprovedRecruiter, requireRole, type Role } from "./authorization";
import { missionCreateSchema, missionPatchSchema } from "./recruiter-validation";
import { RecruiterError } from "./recruiter-service";
import { WorkerError } from "./worker-service";

export const idSchema = z.coerce.number().int().positive().safe();
export const missionInput = missionCreateSchema;
export const missionUpdate = missionPatchSchema;
export const fail = (status: number, error: string) => NextResponse.json({error},{status});
export type RouteContext = {params:Promise<{id?:string}>};
export function protectedRoute(roles: readonly Role[], handler: (request: Request, context: RouteContext, user: NonNullable<Awaited<ReturnType<typeof requireRole>>["user"]>) => Promise<Response>) {
  return async (request: Request, context: RouteContext) => {
    const auth = await requireRole(roles);
    if (auth.response) return auth.response;
    if (auth.user.role === "RECRUTEUR") {
      const approved = await requireApprovedRecruiter();
      if (approved.response) return approved.response;
    }
    try { return await handler(request, context, auth.user); }
    catch (error) {
      if (error instanceof RecruiterError || error instanceof WorkerError) return fail(error.status, error.message);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if(error.code === "P2034" || error.code === "P2028") return fail(409,"Une autre opération est en cours. Réessayez.");
        if(error.code === "P2002") return fail(409,"Ressource déjà existante");
        if(error.code === "P2025" || error.code === "P2003") return fail(404,"Ressource introuvable");
      }
      console.error("Échec API", error);
      return fail(500,"Erreur interne");
    }
  };
}
