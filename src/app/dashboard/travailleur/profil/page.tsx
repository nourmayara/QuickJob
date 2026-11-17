import { requirePageRole } from "@/lib/authorization";
import prisma from "@/lib/prisma";
import { PageHeading } from "@/components/recruiter/ui";
import WorkerProfileForm from "@/components/worker/WorkerProfileForm";
export default async function WorkerProfilePage() {
  const user = await requirePageRole(["TRAVAILLEUR"]);
  const profile = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { firstName: true, name: true, city: true, avatarUrl: true, skills: true, experience: true, languages: true, bio: true, workerSkills: { select: { source: true, skill: { select: { name: true } } } } } });
  return <div className="qj-profile-page"><PageHeading eyebrow="VOS TALENTS ONT LEUR PLACE" title="Mon profil professionnel" description="Faites connaître vos compétences et votre expérience aux recruteurs." /><WorkerProfileForm profile={profile} /></div>;
}
