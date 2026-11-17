import { requirePageRole } from "@/lib/authorization";
import prisma from "@/lib/prisma";
import { PageHeading } from "@/components/recruiter/ui";
import { ProfileIdentityCard, ProfileSection } from "@/components/profile/ProfileUI";

export default async function AdminProfilePage() {
  const sessionUser = await requirePageRole(["ADMIN"]);
  const profile = await prisma.user.findUniqueOrThrow({
    where: { id: sessionUser.id },
    select: { firstName: true, name: true, email: true, phone: true, city: true, avatarUrl: true },
  });
  const fullName = `${profile.firstName} ${profile.name}`.trim();
  return <div className="qj-profile-page">
    <PageHeading eyebrow="VOTRE COMPTE" title="Mon profil" description="Consultez les informations de votre compte administrateur." />
    <ProfileIdentityCard avatarUrl={profile.avatarUrl} name={fullName} role="Administrateur" details={<><span>{profile.email}</span>{profile.city && <span>{profile.city}</span>}</>} />
    <ProfileSection title="Informations du compte"><dl className="qj-profile-readonly"><div><dt>Prénom</dt><dd>{profile.firstName}</dd></div><div><dt>Nom</dt><dd>{profile.name}</dd></div><div><dt>Email</dt><dd>{profile.email}</dd></div><div><dt>Téléphone</dt><dd>{profile.phone || "Non renseigné"}</dd></div><div><dt>Ville</dt><dd>{profile.city || "Non renseignée"}</dd></div><div><dt>Rôle</dt><dd>Administrateur</dd></div></dl></ProfileSection>
  </div>;
}
