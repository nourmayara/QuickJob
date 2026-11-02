import Link from "next/link";
import { requirePageRole } from "@/lib/authorization";
import { missionsFilter } from "@/lib/admin-validation";
import { listAdminMissions } from "@/lib/admin-service";
import { missionStatuses } from "@/lib/recruiter-validation";
import { PageHeading, Panel, Badge, formatDate } from "@/components/recruiter/ui";
import AdminPagination from "@/components/admin/AdminPagination";
export default async function MissionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePageRole(["ADMIN"]);
  const parsed = missionsFilter.safeParse(await searchParams), input = parsed.success ? parsed.data : missionsFilter.parse({});
  const { items, total } = await listAdminMissions(input);
  return <><PageHeading title="Gestion des missions" description="Le masquage retire une mission de la recherche tout en préservant ses candidatures et son historique." />{!parsed.success && <p className="rq-error" role="alert">Filtres invalides.</p>}<form className="rq-filters" method="GET" key={JSON.stringify(input)}><label className="rq-field">Recherche<input name="q" maxLength={160} defaultValue={input.q} placeholder="Titre, ville ou organisation" /></label><label className="rq-field">Statut<select name="status" defaultValue={input.status}><option value="">Tous</option>{Object.entries(missionStatuses).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select></label><button className="rq-button rq-primary">Rechercher</button><Link className="rq-button" href="/admin/missions">Réinitialiser</Link></form><Panel title={`${total} mission(s)`}><div className="qa-table"><table><thead><tr>{["Mission", "Recruteur", "Lieu", "Date", "Statut", "Candidatures", "Action"].map(h => <th key={h} scope="col">{h}</th>)}</tr></thead><tbody>{items.map(m => <tr key={m.id}><td>{m.title}</td><td>{m.recruiter.companyName || `${m.recruiter.firstName} ${m.recruiter.name}`}</td><td>{m.city || "—"}</td><td>{formatDate(m.date)}</td><td><Badge status={m.status} /></td><td>{m._count.applications}</td><td><Link className="rq-link" href={`/admin/missions/${m.id}`}>Consulter</Link></td></tr>)}</tbody></table>{!items.length && <p className="qa-empty">Aucune mission correspondante.</p>}</div><AdminPagination page={input.page} total={total} query={{ q: input.q, status: input.status }} /></Panel></>;
}
