import Link from "next/link";
import { requirePageRole } from "@/lib/authorization";
import { listVerifications, verificationFilter } from "@/lib/recruiter-verification-service";
import { approvalStatuses, approvalLabels } from "@/lib/recruiter-approval";
import { formatDate } from "@/components/recruiter/ui";
import Icon from "@/components/recruiter/Icon";
import { AdminEmpty, AdminListCard, AdminPageHeader } from "@/components/admin/AdminUi";
export default async function Recruiters({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  await requirePageRole(["ADMIN"]); const parsed = verificationFilter.safeParse(await searchParams); const input = parsed.success ? parsed.data : { status: "EN_ATTENTE" as const, page: 1 }; const { items, total } = await listVerifications(input);
  return <main className="qa-admin-page"><AdminPageHeader icon="shield" title="Vérification des recruteurs" description="Examinez les demandes et activez les comptes après vérification." />
    <nav className="qa-admin-tabs" aria-label="Statut des vérifications">{approvalStatuses.map(status => <Link key={status} href={`/admin/recruteurs?status=${status}`} aria-current={input.status === status ? "page" : undefined}>{approvalLabels[status]}</Link>)}</nav>
    <AdminListCard title={`${total} recruteur${total !== 1 ? "s" : ""}`} description="Les comptes historiques conservent leur accès sans décision administrative fictive.">
      {items.length ? <div className="qa-table qa-admin-table"><table><thead><tr>{["Recruteur", "Organisation", "Email", "Téléphone", "Inscription", "Statut", "Action"].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{items.map(item => { const initials = `${item.user.firstName?.[0] || ""}${item.user.name?.[0] || ""}`.toUpperCase(); return <tr key={item.userId}><td><div className="qa-admin-primary"><span className="qa-user-avatar qa-avatar-recruteur">{initials}</span><div><strong>{item.user.firstName} {item.user.name}</strong>{item.user.suspended && <small>Compte suspendu</small>}</div></div></td><td>{item.user.companyName || "Particulier"}</td><td>{item.user.email}</td><td>{item.user.phone || "Non renseigné"}</td><td><span className="qa-admin-inline"><Icon name="calendar" size={16} />{formatDate(item.user.createdAt)}</span></td><td><span className={`qa-badge ${item.status}`}>{approvalLabels[item.status]}</span>{item.legacy && <small>Accès historique</small>}</td><td><Link className="qa-admin-action" href={`/admin/recruteurs/${item.userId}`}><Icon name="eye" size={16} />Consulter</Link></td></tr>; })}</tbody></table></div> : <AdminEmpty icon="shield">Aucun recruteur dans cette catégorie.</AdminEmpty>}
      <nav className="qa-pagination" aria-label="Pagination"><span>Page {input.page} · {total} résultat{total !== 1 ? "s" : ""}</span><div>{input.page > 1 && <Link href={`/admin/recruteurs?status=${input.status}&page=${input.page - 1}`} aria-label="Page précédente">‹</Link>}{input.page * 25 < total && <Link href={`/admin/recruteurs?status=${input.status}&page=${input.page + 1}`} aria-label="Page suivante">›</Link>}</div></nav>
    </AdminListCard>
  </main>;
}
