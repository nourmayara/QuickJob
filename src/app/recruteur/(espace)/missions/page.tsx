import Link from "next/link";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requirePageRole } from "@/lib/authorization";
import { missionInclude, pageNumber } from "@/lib/recruiter-data";
import { missionStatuses } from "@/lib/recruiter-validation";
import { PageHeading, Panel, PublishLink } from "@/components/recruiter/ui";
import MissionTable from "@/components/recruiter/MissionTable";

export default async function MissionsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  const user = await requirePageRole(["RECRUTEUR"]);
  const params = await searchParams;
  const query = params.q?.trim().slice(0, 160) ?? "";
  const status = params.status && params.status in missionStatuses ? params.status : "";
  const page = pageNumber(params.page);
  const where: Prisma.MissionWhereInput = { recruiterId: user.id, ...(query ? { title: { contains: query } } : {}), ...(status ? { status } : {}) };
  const [missions, count] = await Promise.all([prisma.mission.findMany({ where, include: missionInclude, orderBy: { createdAt: "desc" }, skip: (page - 1) * 20, take: 20 }), prisma.mission.count({ where })]);
  const href = (p: number) => `/recruteur/missions?${new URLSearchParams({ q: query, status, page: String(p) })}`;
  return <><PageHeading eyebrow="VOS RECRUTEMENTS" title="Mes missions" description="Retrouvez, organisez et gérez toutes vos missions." action={<PublishLink />} />
    <form className="rq-filters" method="GET"><label className="sr-only" htmlFor="mission-search">Rechercher une mission par titre</label><input id="mission-search" name="q" defaultValue={query} placeholder="Rechercher une mission par titre…" maxLength={160} /><label className="sr-only" htmlFor="mission-status">Filtrer par statut</label><select id="mission-status" name="status" defaultValue={status}><option value="">Tous les statuts</option>{Object.entries(missionStatuses).map(([v, label]) => <option value={v} key={v}>{label}</option>)}</select><button className="rq-button rq-primary">Rechercher</button>{(status || query) && <Link className="rq-button" href="/recruteur/missions">Réinitialiser</Link>}</form>
    <Panel title={`${count} mission${count > 1 ? "s" : ""}`} description="Vos missions sont visibles uniquement dans votre espace."><MissionTable missions={missions} filtered={!!(query || status)} /></Panel>
    {count > 20 && <div className="rq-pagination">{page > 1 ? <Link className="rq-button" href={href(page - 1)}>Précédent</Link> : <span />}<span>Page {page} / {Math.ceil(count / 20)}</span>{page * 20 < count && <Link className="rq-button" href={href(page + 1)}>Suivant</Link>}</div>}
  </>;
}
