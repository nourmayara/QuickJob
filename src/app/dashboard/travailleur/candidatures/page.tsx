import RefreshStatus from "@/components/worker/RefreshStatus";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { requirePageRole } from "@/lib/authorization";
import { pageNumber } from "@/lib/recruiter-data";
import { Badge, EmptyState, PageHeading, Panel, formatDate } from "@/components/recruiter/ui";
export default async function WorkerApplications({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const user = await requirePageRole(["TRAVAILLEUR"]);
  const page = pageNumber((await searchParams).page);
  const where = { workerId: user.id };
  const [rows, count] = await Promise.all([prisma.application.findMany({ where, include: { mission: { select: { title: true, status: true, date: true, city: true } } }, orderBy: { createdAt: "desc" }, take: 20, skip: (page - 1) * 20 }), prisma.application.count({ where })]);
  return <><PageHeading eyebrow="GARDEZ LE FIL DE VOS DÉMARCHES" title="Mes candidatures" description="Retrouvez vos candidatures et les réponses des recruteurs." /><Panel action={<RefreshStatus />} title={`${count} candidature${count > 1 ? "s" : ""}`}>{rows.length ? <div className="rq-table-scroll"><table className="rq-table"><thead><tr><th scope="col">Mission</th><th scope="col">Lieu</th><th scope="col">Date de mission</th><th scope="col">Envoyée le</th><th scope="col">Candidature</th><th scope="col">Statut de mission</th><th scope="col">Action</th></tr></thead><tbody>{rows.map(a => <tr key={a.id}><td>{a.mission.title}</td><td>{a.mission.city || "À préciser"}</td><td>{formatDate(a.mission.date)}</td><td>{formatDate(a.createdAt)}</td><td><Badge status={a.status} application /></td><td><Badge status={a.mission.status} /></td><td><Link href={`/dashboard/travailleur/candidatures/${a.id}`} className="rq-link">Voir le suivi</Link></td></tr>)}</tbody></table></div> : <EmptyState icon="briefcase" title="Votre prochaine aventure commence par une candidature" action={<Link href="/dashboard/travailleur/missions" className="rq-button rq-primary">Trouver une mission</Link>}>Vous n’avez pas encore envoyé de candidature. Explorez les missions publiées par les recruteurs.</EmptyState>}</Panel>{count > 20 && <div className="rq-pagination">{page > 1 ? <Link href={`?page=${page - 1}`} className="rq-button">Précédent</Link> : <span />}<span>Page {page} / {Math.ceil(count / 20)}</span>{page * 20 < count && <Link href={`?page=${page + 1}`} className="rq-button">Suivant</Link>}</div>}</>;
}
