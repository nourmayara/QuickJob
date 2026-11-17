import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { requirePageRole } from "@/lib/authorization";
import { adminUserSelect } from "@/lib/admin-service";
import { formatDate } from "@/components/recruiter/ui";
import Icon, { type IconName } from "@/components/recruiter/Icon";
import ConfirmAction from "@/components/recruiter/ConfirmAction";
import AdminHistory from "@/components/admin/AdminHistory";
const roleLabels: Record<string, string> = { TRAVAILLEUR: "Travailleur", RECRUTEUR: "Recruteur", ADMIN: "Administrateur" };
const verificationLabels: Record<string, string> = { APPROUVE: "Approuvé", EN_ATTENTE: "En attente", REFUSE: "Refusé" };

function DetailItem({ icon, label, value }: { icon: IconName; label: string; value?: string | null }) {
  return <div className="qa-user-detail-item"><span className="qa-user-detail-item-icon"><Icon name={icon} size={17} /></span><div><dt>{label}</dt><dd className="qa-long-text">{value || "Non renseigné"}</dd></div></div>;
}

export default async function UserDetail({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePageRole(["ADMIN"]);
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();
  const u = await prisma.user.findUnique({ where: { id }, select: adminUserSelect });
  if (!u) notFound();
  const fullName = `${u.firstName} ${u.name}`.trim();
  const initials = `${u.firstName?.[0] || ""}${u.name?.[0] || ""}`.toUpperCase() || "U";
  const roleLabel = roleLabels[u.role] || u.role;
  const roleClass = u.role.toLowerCase();
  const verification = u.recruiterVerification?.status;

  return <main className="qa-user-detail-page">
    <header className="qa-user-detail-titlebar"><div><h1>Détail de l’utilisateur</h1><p>Informations complètes sur le compte utilisateur.</p></div><Link className="qa-user-detail-back" href="/admin/utilisateurs"><Icon name="arrow" size={15} />Retour aux utilisateurs</Link></header>
    <section className="qa-user-profile-hero" aria-label={`Profil de ${fullName}`}>
      <div className={`qa-user-detail-avatar qa-avatar-${roleClass}`}>{initials}</div>
      <div className="qa-user-profile-main"><div className="qa-user-profile-name"><h2>{fullName}</h2><span className={`qa-user-badge qa-role-${roleClass}`}><Icon name="user" size={12} />{roleLabel}</span></div><p><Icon name="mail" size={14} />{u.email}</p></div>
      <div className="qa-user-profile-meta"><span className={`qa-user-badge ${u.suspended ? "qa-account-suspended" : "qa-account-active"}`}><i />{u.suspended ? "Compte suspendu" : "Compte actif"}</span><span className="qa-user-created"><Icon name="calendar" size={16} /><small>Inscrit le</small><strong>{formatDate(u.createdAt)}</strong></span></div>
    </section>
    <div className="qa-user-detail-layout">
      <section className="qa-user-detail-card qa-user-info-card">
        <div className="qa-user-detail-card-title"><span><Icon name="user" size={18} /></span><h2>Informations personnelles et professionnelles</h2></div>
        <dl className="qa-user-detail-fields"><DetailItem icon="user" label="Nom complet" value={fullName} /><DetailItem icon="mail" label="Adresse e-mail" value={u.email} /><DetailItem icon="headset" label="Téléphone" value={u.phone} /><DetailItem icon="pin" label="Ville" value={u.city} /><DetailItem icon="home" label="Adresse" value={u.address} />{(u.role === "RECRUTEUR" || u.companyName) && <DetailItem icon="store" label="Organisation" value={u.companyName} />}{(u.role === "RECRUTEUR" || u.sector) && <DetailItem icon="layers" label="Secteur" value={u.sector} />}</dl>
        {u.bio && <div className="qa-user-detail-bio"><Icon name="document" size={17} /><div><strong>Profil</strong><p className="qa-long-text">{u.bio}</p></div></div>}
      </section>
      <aside className="qa-user-detail-card qa-user-account-card">
        <div className="qa-user-detail-card-title"><span><Icon name="shield" size={18} /></span><h2>Gestion du compte</h2></div>
        <dl className="qa-user-account-list"><div><dt><Icon name="user" size={16} />Rôle</dt><dd><span className={`qa-user-badge qa-role-${roleClass}`}>{roleLabel}</span></dd></div><div><dt><Icon name="shield" size={16} />Compte</dt><dd><span className={`qa-user-badge ${u.suspended ? "qa-account-suspended" : "qa-account-active"}`}><i />{u.suspended ? "Suspendu" : "Actif"}</span></dd></div>{u.role === "RECRUTEUR" && <div><dt><Icon name="check" size={16} />Vérification</dt><dd><span className={`qa-user-badge qa-verification-${verification?.toLowerCase() || "unknown"}`}>{verification ? verificationLabels[verification] || verification : "Non renseigné"}</span></dd></div>}<div><dt><Icon name="calendar" size={16} />Inscription</dt><dd>{formatDate(u.createdAt)}</dd></div></dl>
        <div className="qa-account-actions">{id !== admin.id ? <ConfirmAction endpoint={`/api/admin/users/${id}`} data={{ suspended: !u.suspended }} label={u.suspended ? "Réactiver le compte" : "Suspendre le compte"} title={u.suspended ? "Réactiver ce compte ?" : "Suspendre ce compte ?"} description="La décision de vérification du recruteur est conservée. Les sessions d’un compte suspendu seront invalidées." danger={!u.suspended} /> : <p>Vous ne pouvez pas suspendre votre propre compte.</p>}{u.role === "RECRUTEUR" && <Link className="rq-button" href={`/admin/recruteurs/${id}`}>Vérifier le recruteur</Link>}</div>
      </aside>
    </div>
    <div className="qa-user-detail-history"><AdminHistory type="USER" id={id} /></div>
  </main>;
}
