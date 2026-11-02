import { requirePageRole } from "@/lib/authorization";
import prisma from "@/lib/prisma";
import { PageHeading, Panel } from "@/components/recruiter/ui";
import WorkerProfileForm from "@/components/worker/WorkerProfileForm";
export default async function WorkerProfilePage() {
  const user = await requirePageRole(["TRAVAILLEUR"]);
  const profile = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { firstName: true, name: true, city: true, avatarUrl: true, skills: true, experience: true, languages: true, bio: true, workerSkills: { select: { source: true, skill: { select: { name: true } } } } } });
  return <><PageHeading eyebrow="VOS TALENTS ONT LEUR PLACE" title="Mon profil professionnel" description="Faites connaître vos compétences et votre expérience aux recruteurs." /><Panel title="Votre présentation" description="Les expériences et la présentation sont facultatives."><WorkerProfileForm profile={profile} /></Panel></>;
}
