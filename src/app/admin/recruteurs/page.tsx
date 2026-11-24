import Link from "next/link";
import { requirePageRole } from "@/lib/authorization";
import { listVerifications, verificationFilter } from "@/lib/recruiter-verification-service";
import { approvalLabels } from "@/lib/recruiter-approval";
import { formatDate } from "@/components/recruiter/ui";
import Icon from "@/components/recruiter/Icon";
import { AdminEmpty, AdminListCard, AdminPageHeader } from "@/components/admin/AdminUi";
import AutoFilterForm from "@/components/filters/AutoFilterForm";
import AdminPagination from "@/components/admin/AdminPagination";
export default async function Recruiters({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePageRole(["ADMIN"]); const parsed = verificationFilter.safeParse(await searchParams); const input = parsed.success ? parsed.data : verificationFilter.parse({}); const { items, total } = await listVerifications(input);
  return <main className="qa-admin-page"><AdminPageHeader icon="shield" title="Vérification des recruteurs" description="Examinez les demandes et activez les comptes après vérification." />
    {!parsed.success && <p role="alert" className="rq-error">Filtres invalides. Les valeurs par défaut ont été restaurées.</p>}
    <AutoFilterForm key={JSON.stringify(input)} resetHref="/admin/recruteurs" ariaLabel="Filtrer les recruteurs" resultCount={total}>
      <label className="qj-filter-field qj-filter-search"><span>Recherche</span><div><Icon name="search" size={18}/><input type="search" name="q" defaultValue={input.q} maxLength={254} autoComplete="off" placeholder="Nom, email ou organisation…"/></div></label>
      <label className="qj-filter-field"><span>Statut</span><select name="status" defaultValue={input.status}><option value="">Tous</option><option value="EN_ATTENTE">En attente</option><option value="APPROUVE">Approuvé</option><option value="REFUSE">Refusé</option></select></label>
      <label className="qj-filter-field"><span>Type de recruteur</span><select name="recruiterType" defaultValue={input.recruiterType}><option value="">Tous</option><option value="COMPANY">Entreprise</option><option value="INDIVIDUAL">Particulier</option></select></label>
      <label className="qj-filter-field"><span>Date d’inscription</span><input type="date" name="date" defaultValue={input.date}/></label>
    </AutoFilterForm>
    <AdminListCard title={`${total} recruteur${total !== 1 ? "s" : ""}`} description="Les comptes historiques conservent leur accès sans décision administrative fictive.">
      {items.length ? <div className="qa-table qa-admin-table"><table><thead><tr>{["Recruteur", "Organisation", "Email", "Téléphone", "Inscription", "Statut", "Action"].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{items.map(item => { const initials = `${item.user.firstName?.[0] || ""}${item.user.name?.[0] || ""}`.toUpperCase(); return <tr key={item.userId}><td><div className="qa-admin-primary"><span className="qa-user-avatar qa-avatar-recruteur">{initials}</span><div><strong>{item.user.firstName} {item.user.name}</strong>{item.user.suspended && <small>Compte suspendu</small>}</div></div></td><td>{item.user.companyName || "Particulier"}</td><td>{item.user.email}</td><td>{item.user.phone || "Non renseigné"}</td><td><span className="qa-admin-inline"><Icon name="calendar" size={16} />{formatDate(item.user.createdAt)}</span></td><td><span className={`qa-badge ${item.status}`}>{approvalLabels[item.status]}</span></td><td><Link className="qa-admin-action" href={`/admin/recruteurs/${item.userId}`}><Icon name="eye" size={16} />Consulter</Link></td></tr>; })}</tbody></table></div> : <AdminEmpty icon="shield">Aucun recruteur dans cette catégorie.</AdminEmpty>}
      <AdminPagination page={input.page} total={total} query={{status:input.status,q:input.q,recruiterType:input.recruiterType,date:input.date}}/>
    </AdminListCard>
  </main>;
}
