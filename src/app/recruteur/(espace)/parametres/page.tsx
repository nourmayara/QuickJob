import Link from "next/link";
import { requirePageRole } from "@/lib/authorization";
import { PageHeading, Panel, formatDate } from "@/components/recruiter/ui";
import LogoutButton from "@/components/LogoutButton";
export default async function SettingsPage() {
  const user = await requirePageRole(["RECRUTEUR"]);
  return <><PageHeading eyebrow="VOTRE COMPTE" title="Paramètres" description="Consultez les informations et les accès de votre compte." /><Panel title="Compte et sécurité"><div className="rq-detail"><dl className="rq-detail-grid"><div><dt>Email de connexion</dt><dd>{user.email}</dd></div><div><dt>Rôle</dt><dd>Recruteur</dd></div><div><dt>Membre depuis le</dt><dd>{formatDate(user.createdAt)}</dd></div></dl><div className="rq-notice">La modification du mot de passe et les préférences de notification ne sont pas encore disponibles.</div><div className="rq-detail-actions"><Link className="rq-button" href="/recruteur/profil">Modifier mon profil</Link><LogoutButton /></div></div></Panel></>;
}
