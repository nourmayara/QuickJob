import prisma from "@/lib/prisma";
import { requirePageRole } from "@/lib/authorization";
import { PageHeading, Panel } from "@/components/recruiter/ui";
import ProfileForm from "@/components/recruiter/ProfileForm";
export default async function ProfilePage() {
  const user = await requirePageRole(["RECRUTEUR"]);
  const profile = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { name: true, firstName: true, email: true, phone: true, city: true, companyName: true, sector: true, bio: true, avatarUrl: true } });
  return <><PageHeading eyebrow="VOTRE PRÉSENTATION" title="Mon profil" description="Présentez votre activité et gardez vos coordonnées à jour." /><Panel title="Informations professionnelles" description="Ces informations décrivent votre compte recruteur."><ProfileForm profile={profile} /></Panel></>;
}
