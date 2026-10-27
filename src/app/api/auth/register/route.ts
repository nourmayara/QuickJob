import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { registerSchema } from "@/lib/validation";
import { createSession } from "@/lib/session";

export async function POST(request: Request) {
  const parsed = registerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { name, email, password, firstName, phone, role, city, recruiterType, companyName } = parsed.data;
  try {
    const user = await prisma.user.create({
      data: { name, email, firstName, phone, role, city: role === "TRAVAILLEUR" ? city : null, recruiterType: role === "RECRUTEUR" ? recruiterType : null, companyName: role === "RECRUTEUR" && recruiterType === "COMPANY" ? companyName : null, password: await bcrypt.hash(password, 10), ...(role === "RECRUTEUR" ? { recruiterVerification: { create: { status: "EN_ATTENTE", requestedAt: new Date() } } } : {}) },
      select: { id: true, name: true, email: true, role: true, recruiterVerification: { select: {status:true} } },
    });
    await createSession(user.id);
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 409 });
    }
    console.error("Échec de l'inscription", error);
    return NextResponse.json({ error: "Impossible de créer le compte" }, { status: 500 });
  }
}
