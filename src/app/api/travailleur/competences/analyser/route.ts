import { NextResponse } from "next/server";
import { fail, protectedRoute } from "@/lib/api";
import { extractSkillsWithFallback } from "@/lib/skill-extraction-server";
import { skillAnalysisSchema } from "@/lib/worker-validation";

export const POST = protectedRoute(["TRAVAILLEUR"], async request => {
  const parsed = skillAnalysisSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, parsed.error.issues[0].message);
  return NextResponse.json(await extractSkillsWithFallback(parsed.data.experience));
});
