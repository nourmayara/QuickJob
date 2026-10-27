import Link from "next/link";
import prisma from "@/lib/prisma";
import { requirePageRole } from "@/lib/authorization";
import { pageNumber, workerSelect } from "@/lib/recruiter-data";
import { Avatar, Badge, EmptyState, PageHeading, Panel, formatDate } from "@/components/recruiter/ui";
export default async function SelectedWorkersPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const user = await requirePageRole(["RECRUTEUR"]);
  const page = pageNumber((await searchParams).page);
  const where = { status: "ACCEPTED", mission: { recruiterId: user.id } };
  const [rows, count] = await Promise.all([prisma.application.findMany({ where, include: { worker: { select: workerSelect }, mission: { select: { title: true, date: true, status: true } } }, orderBy: { createdAt: "desc" }, take: 20, skip: (page - 1) * 20 }), prisma.application.count({ where })]);
  return <><PageHeading eyebrow="VOTRE ÉQUIPE" title="Travailleurs sélectionnés" description="Retrouvez les candidatures acceptées pour l’ensemble de vos missions." /><Panel title={`${count} sélection${count > 1 ? "s" : ""}`} description="Une candidature acceptée correspond à une place attribuée.">{rows.length ? <div className="rq-table-scroll"><table className="rq-table"><thead><tr><th scope="col">Travailleur</th><th scope="col">Mission</th><th scope="col">Date</th><th scope="col">Sélection</th><th scope="col">Statut de la mission</th><th scope="col">Action</th></tr></thead><tbody>{rows.map(a => <tr key={a.id}><td><div className="rq-person"><Avatar name={`${a.worker.firstName} ${a.worker.name}`} /><strong>{a.worker.firstName} {a.worker.name}</strong></div></td><td>{a.mission.title}</td><td>{formatDate(a.mission.date)}</td><td><Badge status="ACCEPTED" application /><small>Confirmation du travailleur non disponible</small></td><td><Badge status={a.mission.status} /></td><td><Link className="rq-link" href={`/recruteur/candidatures/${a.id}`}>Voir le détail</Link></td></tr>)}</tbody></table></div> : <EmptyState icon="check" title="Votre équipe se construit ici">Acceptez des candidatures pour retrouver les travailleurs sélectionnés et leurs missions.</EmptyState>}</Panel>
    {count > 20 && <div className="rq-pagination">{page > 1 ? <Link className="rq-button" href={`?page=${page - 1}`}>Précédent</Link> : <span />}<span>Page {page} / {Math.ceil(count / 20)}</span>{page * 20 < count && <Link className="rq-button" href={`?page=${page + 1}`}>Suivant</Link>}</div>}
    <div className="rq-notice">Les évaluations après mission (US29) seront disponibles dans une prochaine étape.</div>
  </>;
}
