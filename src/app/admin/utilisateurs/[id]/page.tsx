import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { requirePageRole } from "@/lib/authorization";
import { adminUserSelect } from "@/lib/admin-service";
import { PageHeading, Panel, formatDate } from "@/components/recruiter/ui";
import ConfirmAction from "@/components/recruiter/ConfirmAction";
import AdminHistory from "@/components/admin/AdminHistory";
export default async function UserDetail({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePageRole(["ADMIN"]), id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();
  const u = await prisma.user.findUnique({ where: { id }, select: adminUserSelect }); if (!u) notFound();
  const fields = [["Nom", `${u.firstName} ${u.name}`], ["Email", u.email], ["Téléphone", u.phone], ["Rôle", u.role], ["Organisation", u.companyName], ["Ville", u.city], ["Adresse", u.address], ["Secteur", u.sector], ["Inscription", formatDate(u.createdAt)], ["Compte", u.suspended ? "Suspendu" : "Actif"], ["Vérification", u.recruiterVerification?.status]];
  return <><PageHeading title="Détail de l’utilisateur" description="La suspension invalide les sessions et ne modifie pas la décision de vérification." action={<Link className="rq-button" href="/admin/utilisateurs">Retour</Link>} /><Panel title={`${u.firstName} ${u.name}`}><div className="rq-detail"><dl className="rq-detail-grid">{fields.map(([k, v]) => <div key={k}><dt>{k}</dt><dd className="qa-long-text">{v || "Non renseigné"}</dd></div>)}</dl><p className="qa-long-text">{u.bio}</p><div className="rq-detail-actions">{id !== admin.id ? <ConfirmAction endpoint={`/api/admin/users/${id}`} data={{ suspended: !u.suspended }} label={u.suspended ? "Réactiver le compte" : "Suspendre le compte"} title={u.suspended ? "Réactiver ce compte ?" : "Suspendre ce compte ?"} description="La décision de vérification du recruteur est conservée. Les sessions d’un compte suspendu seront invalidées." danger={!u.suspended} /> : <p>Vous ne pouvez pas suspendre votre propre compte.</p>}{u.role === "RECRUTEUR" && <Link className="rq-button" href={`/admin/recruteurs/${id}`}>Vérifier le recruteur</Link>}</div></div></Panel><AdminHistory type="USER" id={id} /></>;
}
