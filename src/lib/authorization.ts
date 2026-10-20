import "server-only";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import prisma from "./prisma";
import { getSession } from "./session";
import { dashboardPath } from "./roles";
export const ROLES = ["TRAVAILLEUR", "RECRUTEUR", "ADMIN"] as const;
export type Role = typeof ROLES[number];
export const publicUserSelect = { id: true, name: true, firstName: true, email: true, role: true, createdAt: true, suspended: true } as const;
export async function requireRole(roles: readonly Role[] = ROLES) {
  const session = await getSession();
  const user = session ? await prisma.user.findUnique({where:{id:session.userId},select:publicUserSelect}) : null;
  if (!user || user.suspended) return { user: null, response: NextResponse.json({error:"Non authentifié"},{status:401}) };
  if (!roles.includes(user.role as Role)) return { user: null, response: NextResponse.json({error:"Accès interdit"},{status:403}) };
  return { user, response: null };
}
export async function requirePageRole(roles: readonly Role[] = ROLES) {
  const auth = await requireRole(roles);
  if (!auth.user) {
    if (auth.response.status === 401) redirect("/api/auth/session-expired");
    const current = await requireRole();
    if (current.user) redirect(dashboardPath(current.user.role));
    redirect("/login");
  }
  return auth.user;
}
