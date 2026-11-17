import Link from "next/link";
import { requirePageRole } from "@/lib/authorization";
import { missionsFilter } from "@/lib/admin-validation";
import { listAdminMissions } from "@/lib/admin-service";
import { missionStatuses } from "@/lib/recruiter-validation";
import { Badge, formatDate } from "@/components/recruiter/ui";
import Icon from "@/components/recruiter/Icon";
import AdminPagination from "@/components/admin/AdminPagination";
import { AdminEmpty, AdminListCard, AdminPageHeader } from "@/components/admin/AdminUi";
export default async function MissionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePageRole(["ADMIN"]); const parsed = missionsFilter.safeParse(await searchParams), input = parsed.success ? parsed.data : missionsFilter.parse({}); const { items, total } = await listAdminMissions(input);
  return <main className="qa-admin-page"><AdminPageHeader icon="briefcase" title="Gestion des missions" description="Suivez et gérez toutes les missions publiées sur la plateforme." />{!parsed.success && <p className="rq-error" role="alert">Filtres invalides.</p>}
    <form className="qa-admin-filters" method="GET" key={JSON.stringify(input)}><label className="qa-admin-search"><span>Recherche</span><div><Icon name="search" size={18} /><input name="q" maxLength={160} defaultValue={input.q} placeholder="Titre, ville ou organisation…" /></div></label><label><span>Statut</span><select name="status" defaultValue={input.status}><option value="">Tous</option>{Object.entries(missionStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button className="rq-button rq-primary" type="submit"><Icon name="search" size={17} />Rechercher</button><Link className="rq-button qa-admin-reset" href="/admin/missions">Réinitialiser</Link></form>
    <AdminListCard title={`${total} mission${total !== 1 ? "s" : ""}`}><div className="qa-table qa-admin-table"><table><thead><tr>{["Mission", "Recruteur", "Lieu", "Date", "Statut", "Candidatures", "Action"].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{items.map(m => <tr key={m.id}><td><div className="qa-admin-primary"><span className="qa-admin-row-icon"><Icon name="briefcase" size={18} /></span><strong>{m.title}</strong></div></td><td>{m.recruiter.companyName || `${m.recruiter.firstName} ${m.recruiter.name}`}</td><td><span className="qa-admin-inline"><Icon name="pin" size={16} />{m.city || "—"}</span></td><td><span className="qa-admin-inline"><Icon name="calendar" size={16} />{formatDate(m.date)}</span></td><td><Badge status={m.status} /></td><td><span className="qa-admin-count">{m._count.applications}</span></td><td><Link className="qa-admin-action" href={`/admin/missions/${m.id}`}><Icon name="eye" size={16} />Consulter</Link></td></tr>)}</tbody></table>{!items.length && <AdminEmpty icon="briefcase">Aucune mission correspondante.</AdminEmpty>}</div><AdminPagination page={input.page} total={total} pageSize={10} query={{ q: input.q, status: input.status }} /></AdminListCard>
  </main>;
}
