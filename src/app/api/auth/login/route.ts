import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { loginSchema } from "@/lib/validation";
import { createSession } from "@/lib/session";

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || user.suspended || !["TRAVAILLEUR", "RECRUTEUR", "ADMIN"].includes(user.role) || !(await bcrypt.compare(parsed.data.password, user.password))) {
    return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 });
  }
  await createSession(user.id);
  const verification = user.role === "RECRUTEUR" ? await prisma.recruiterVerification.findUnique({where:{userId:user.id},select:{status:true}}) : null;
  return NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role, recruiterVerification: verification });
}
