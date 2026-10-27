import Link from "next/link";
import { notFound } from "next/navigation";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requirePageRole } from "@/lib/authorization";
import { pageNumber, workerSelect } from "@/lib/recruiter-data";
import { applicationStatuses } from "@/lib/recruiter-validation";
import { Avatar, Badge, EmptyState, PageHeading, Panel, formatDate } from "@/components/recruiter/ui";

export default async function ApplicationsPage({ searchParams }: { searchParams: Promise<{ status?: string; mission?: string; page?: string }> }) {
  const user = await requirePageRole(["RECRUTEUR"]);
  const params = await searchParams;
  const status = params.status && params.status in applicationStatuses ? params.status : "";
  const missionId = params.mission ? Number(params.mission) : undefined;
  if (missionId !== undefined && (!Number.isSafeInteger(missionId) || missionId < 1 || !await prisma.mission.findFirst({ where: { id: missionId, recruiterId: user.id }, select: { id: true } }))) notFound();
  const where: Prisma.ApplicationWhereInput = { mission: { recruiterId: user.id }, ...(status ? { status } : {}), ...(missionId ? { missionId } : {}) };
  const page = pageNumber(params.page);
  const [applications, count, missions] = await Promise.all([
    prisma.application.findMany({ where, include: { worker: { select: workerSelect }, mission: { select: { id: true, title: true } } }, orderBy: [{ missionId: "desc" }, { createdAt: "desc" }], take: 20, skip: (page - 1) * 20 }),
    prisma.application.count({ where }),
    prisma.mission.findMany({ where: { recruiterId: user.id }, select: { id: true, title: true }, orderBy: { createdAt: "desc" } }),
  ]);
  const groups = new Map<number, typeof applications>();
  for (const a of applications) groups.set(a.missionId, [...(groups.get(a.missionId) ?? []), a]);
  const href = (p: number) => `/recruteur/candidatures?${new URLSearchParams({ status, ...(missionId ? { mission: String(missionId) } : {}), page: String(p) })}`;
  return <><PageHeading eyebrow="CONSTITUEZ VOTRE ÉQUIPE" title="Candidatures" description="Découvrez les talents intéressés et sélectionnez les profils adaptés à vos missions." />
    <form className="rq-filters" method="GET"><label className="sr-only" htmlFor="application-mission">Mission</label><select name="mission" id="application-mission" defaultValue={missionId ?? ""}><option value="">Toutes mes missions</option>{missions.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}</select><label className="sr-only" htmlFor="application-status">Statut</label><select name="status" id="application-status" defaultValue={status}><option value="">Tous les statuts</option>{Object.entries(applicationStatuses).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select><button className="rq-button rq-primary">Filtrer</button>{(status || missionId) && <Link href="/recruteur/candidatures" className="rq-button">Réinitialiser</Link>}</form>
    <p className="rq-subtle" style={{ marginBottom: 16 }}>{count} candidature{count > 1 ? "s" : ""}</p>
    {applications.length ? [...groups].map(([id, rows]) => <Panel key={id} title={rows[0].mission.title} action={<Link className="rq-link" href={`/recruteur/missions/${id}`}>Voir la mission</Link>}><div className="rq-table-scroll"><table className="rq-table"><thead><tr><th scope="col">Travailleur</th><th scope="col">Compétences</th><th scope="col">Date de candidature</th><th scope="col">Statut</th><th scope="col">Action</th></tr></thead><tbody>{rows.map(a => <tr key={a.id}><td><div className="rq-person"><Avatar name={`${a.worker.firstName} ${a.worker.name}`} /><strong>{a.worker.firstName} {a.worker.name}</strong></div></td><td>{a.worker.skills || "Non renseignées"}</td><td>{formatDate(a.createdAt)}</td><td><Badge status={a.status} application /></td><td><Link className="rq-link" href={`/recruteur/candidatures/${a.id}`}>Voir le profil et décider</Link></td></tr>)}</tbody></table></div></Panel>) : <Panel title="Candidatures reçues"><EmptyState icon="people" title="Aucune candidature à afficher">{status || missionId ? "Aucune candidature ne correspond à vos filtres." : "Les candidatures à vos missions apparaîtront ici. Vous pourrez consulter les profils et confirmer vos décisions."}</EmptyState></Panel>}
    {count > 20 && <div className="rq-pagination">{page > 1 ? <Link className="rq-button" href={href(page - 1)}>Précédent</Link> : <span />}<span>Page {page} / {Math.ceil(count / 20)}</span>{page * 20 < count && <Link className="rq-button" href={href(page + 1)}>Suivant</Link>}</div>}
  </>;
}
