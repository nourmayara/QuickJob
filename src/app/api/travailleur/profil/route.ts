import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { protectedRoute, fail } from "@/lib/api";
import { workerProfileUpdateSchema } from "@/lib/worker-validation";

const select = { id: true, name: true, firstName: true, email: true, city: true, avatarUrl: true, skills: true, experience: true, languages: true, bio: true, recommendationOptIn: true } as const;
export const GET = protectedRoute(["TRAVAILLEUR"], async (_request, _context, user) => NextResponse.json(await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select })));
export const PATCH = protectedRoute(["TRAVAILLEUR"], async (request, _context, user) => {
  const parsed = workerProfileUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, parsed.error.issues[0].message);
  const { selectedSkills, ...profile } = parsed.data;
  return NextResponse.json(await prisma.$transaction(async tx => {
    await tx.workerSkill.deleteMany({ where: { workerId: user.id } });
    for (const selected of selectedSkills) {
      const key = selected.name.normalize("NFKD").replace(/\p{M}/gu, "").trim().replace(/\s+/g, " ").toLocaleLowerCase("fr");
      const skill = await tx.skill.upsert({ where: { key }, update: { name: selected.name }, create: { key, name: selected.name } });
      await tx.workerSkill.create({ data: { workerId: user.id, skillId: skill.id, source: selected.source === "manual" ? "PROFILE" : "AI_CONFIRMED" } });
    }
    return tx.user.update({ where: { id: user.id }, data: profile, select });
  }));
});
