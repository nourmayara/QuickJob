import Link from "next/link";
import { categoryIcon } from "@/components/category-icon";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requirePageRole } from "@/lib/authorization";
import { missionInclude, pageNumber } from "@/lib/recruiter-data";
import { activeScheduleStatuses } from "@/lib/schedule-service";
import { missionStatuses } from "@/lib/recruiter-validation";
import { Badge, EmptyState, PublishLink, formatDate } from "@/components/recruiter/ui";
import SoftIcon from "@/components/SoftIcon";
import Icon, { type IconName } from "@/components/recruiter/Icon";
import ConfirmAction from "@/components/recruiter/ConfirmAction";
import MissionArtwork from "@/components/worker/MissionArtwork";
import "./missions.css";

type Params = { q?: string; status?: string; category?: string; city?: string; page?: string; view?: string };
function value(input: unknown, max = 100) { return typeof input === "string" ? input.trim().slice(0, max) : ""; }
export default async function MissionsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const user = await requirePageRole(["RECRUTEUR"]);
  const params = await searchParams;
  const query = value(params.q, 160), category = value(params.category), city = value(params.city);
  const requestedStatus = value(params.status);
  const status = requestedStatus === "ACTIVE" || Object.hasOwn(missionStatuses, requestedStatus) ? requestedStatus : "";
  const view = params.view === "grid" ? "grid" : "list";
  const scope = { recruiterId: user.id };
  const filter: Prisma.MissionWhereInput = { ...scope,
    ...(query ? { OR: [{ title: { contains: query } }, { category: { contains: query } }, { city: { contains: query } }] } : {}),
    ...(category ? { category } : {}), ...(city ? { city } : {}),
  };
  const where: Prisma.MissionWhereInput = { ...filter, ...(status === "ACTIVE" ? { status: { in: activeScheduleStatuses } } : status ? { status } : {}) };
  const [count, globalGroups, filteredGroups, categories, cities] = await prisma.$transaction(async tx => Promise.all([
    tx.mission.count({ where }),
    tx.mission.groupBy({ by: ["status"], where: scope, _count: { _all: true }, orderBy: { status: "asc" } }),
    tx.mission.groupBy({ by: ["status"], where: filter, _count: { _all: true }, orderBy: { status: "asc" } }),
    tx.mission.findMany({ where: { ...scope, category: { not: null } }, distinct: ["category"], select: { category: true }, orderBy: { category: "asc" } }),
    tx.mission.findMany({ where: { ...scope, city: { not: null } }, distinct: ["city"], select: { city: true }, orderBy: { city: "asc" } }),
  ]));
  const pages = Math.max(1, Math.ceil(count / 20));
  const page = Math.min(pageNumber(value(params.page)), pages);
  const missions = await prisma.mission.findMany({ where, include: missionInclude, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * 20, take: 20 });
  const groupCount = (groups: typeof globalGroups, status: string) => groups.reduce((n, g) => n + (!status || (status === "ACTIVE" ? activeScheduleStatuses.includes(g.status) : g.status === status) ? g._count._all : 0), 0);
  const href = (changes: Partial<Record<keyof Params, string>> = {}) => {
    const search = new URLSearchParams({ q: query, category, city, status, view, ...changes });
    for (const [key, val] of [...search.entries()]) if (!val || (key === "view" && val === "list")) search.delete(key);
    return `/recruteur/missions${search.size ? `?${search}` : ""}`;
  };
  const stats: { label: string; status: string; icon: IconName; tone: "sky" | "yellow" | "glass"; note: string }[] = [
    { label: "Missions totales", status: "", icon: "briefcase", tone: "sky", note: "Tous statuts confondus" },
    { label: "Missions actives", status: "ACTIVE", icon: "calendar", tone: "sky", note: "Publiées, complètes, clôturées ou en cours" },
    { label: "Missions terminées", status: "COMPLETED", icon: "check", tone: "glass", note: "Missions menées à leur terme" },
    { label: "Missions annulées", status: "CANCELLED", icon: "close", tone: "yellow", note: "Conservées dans votre historique" },
  ];
  const tabs = [["", "Toutes"], ["ACTIVE", "Actives"], ["PUBLISHED", "Publiées"], ["COMPLETED", "Terminées"], ["CANCELLED", "Annulées"]];
  if (status && !tabs.some(([key]) => key === status)) tabs.push([status, missionStatuses[status as keyof typeof missionStatuses]]);
  const filtered = !!(query || status || category || city);
  return <div className="rqm-page">
    <section className="rqm-hero" aria-labelledby="missions-title"><SoftIcon name="briefcase" tone="yellow" size={38} /><div className="rqm-hero-copy"><p>VOS MISSIONS</p><h1 id="missions-title">Mes missions</h1><span>Retrouvez, organisez et gérez toutes vos missions.</span></div><div className="rqm-hero-art" aria-hidden="true"><SoftIcon name="calendar" size={70} /><SoftIcon name="shield" tone="yellow" size={36} /><SoftIcon name="briefcase" size={38} /></div><PublishLink /></section>
    <section className="rqm-kpis" aria-label="Statistiques de vos missions">{stats.map((stat, i) => <article key={stat.status} className={`rqm-kpi rqm-kpi-${i}`}><SoftIcon name={stat.icon} tone={stat.tone} size={28} /><div><strong data-mission-kpi={["total", "active", "completed", "cancelled"][i]} data-value={groupCount(globalGroups, stat.status)}>{groupCount(globalGroups, stat.status).toLocaleString("fr-FR")}</strong><h2>{stat.label}</h2><p>{stat.note}</p></div></article>)}</section>
    <form className="rqm-filters" method="GET" action="/recruteur/missions"><div className="rqm-search"><Icon name="search" /><label className="sr-only" htmlFor="mission-search">Rechercher par titre, catégorie ou ville</label><input id="mission-search" name="q" defaultValue={query} placeholder="Rechercher par titre, catégorie ou ville…" maxLength={160} /></div>
      <label className="rqm-select"><Icon name="grid" /><span className="sr-only">Catégorie</span><select name="category" defaultValue={category}><option value="">Toutes les catégories</option>{category && !categories.some(c => c.category === category) && <option value={category}>{category}</option>}{categories.filter(c => c.category?.trim()).map(c => <option key={c.category} value={c.category!}>{c.category}</option>)}</select></label>
      <label className="rqm-select"><Icon name="pin" /><span className="sr-only">Ville</span><select name="city" defaultValue={city}><option value="">Toutes les villes</option>{city && !cities.some(c => c.city === city) && <option value={city}>{city}</option>}{cities.filter(c => c.city?.trim()).map(c => <option key={c.city} value={c.city!}>{c.city}</option>)}</select></label>
      <label className="rqm-select"><Icon name="briefcase" /><span className="sr-only">Statut</span><select name="status" defaultValue={status}><option value="">Tous les statuts</option><option value="ACTIVE">Actives</option>{Object.entries(missionStatuses).map(([v, label]) => <option value={v} key={v}>{label}</option>)}</select></label><input type="hidden" name="view" value={view} /><button className="rq-button rq-primary" type="submit">Rechercher</button>{filtered && <Link className="rqm-reset" href={href({ q: "", category: "", city: "", status: "" })}>Réinitialiser</Link>}
    </form>
    <section className="rqm-results" aria-label="Liste de vos missions"><div className="rqm-toolbar"><nav className="rqm-tabs" aria-label="Missions par statut">{tabs.map(([key, label]) => <Link key={key} href={href({ status: key })} aria-current={status === key ? "page" : undefined}>{label}<span>{groupCount(filteredGroups, key)}</span></Link>)}</nav><div className="rqm-view-switch" role="group" aria-label="Affichage des missions"><Link href={href({ view: "list", page: String(page) })} aria-label="Vue liste" aria-current={view === "list" ? "page" : undefined}><Icon name="menu" /></Link><Link href={href({ view: "grid", page: String(page) })} aria-label="Vue grille" aria-current={view === "grid" ? "page" : undefined}><Icon name="grid" /></Link></div></div>
      <div className="rqm-result-label"><h2>{count.toLocaleString("fr-FR")} mission{count > 1 ? "s" : ""}{filtered ? " trouvée" + (count > 1 ? "s" : "") : ""}</h2><span>Votre espace recruteur privé</span></div>
      {missions.length ? <ul className={`rqm-cards rqm-${view}`}>{missions.map(m => <li key={m.id}><article className="rqm-card" data-mission-id={m.id}>
        <Link className="rqm-mission-title" href={`/recruteur/missions/${m.id}`}><MissionArtwork category={m.category} className="rqm-photo" /><div><span>Mission #{m.id}</span><h3>{m.title}</h3></div></Link>
        <span className="rqm-category"><SoftIcon name={categoryIcon(m.category)} size={17} />{m.category || "Non renseignée"}</span>
        <p className="rqm-description">{m.description}</p>
        <div className="rqm-meta"><span><SoftIcon name="calendar" size={14} />{formatDate(m.date)}</span><span><SoftIcon name="pin" size={14} />{m.city || "Lieu à préciser"}</span><span><SoftIcon name="clock" size={14} />{m.startTime && m.endTime ? `${m.startTime} – ${m.endTime}` : "Horaire à préciser"}</span><Link href={`/recruteur/candidatures?mission=${m.id}`} title="Consulter les candidatures"><SoftIcon name="people" tone="yellow" size={14} /><span>{m._count.applications} candidature{m._count.applications > 1 ? "s" : ""}<small>{Math.max(0, m.capacity - m.applications.length)} / {m.capacity} place{m.capacity > 1 ? "s" : ""} disponible{m.capacity > 1 ? "s" : ""}</small></span></Link></div>
        <div className="rqm-pay"><strong>{m.pay === null ? "À préciser" : `${m.pay.toLocaleString("fr-TN")} TND`}</strong><small>Par travailleur · par mission</small></div>
        <Badge status={m.status} />
        <div className="rqm-actions" aria-label={`Actions pour ${m.title}`}><Link href={`/recruteur/missions/${m.id}`} aria-label={`Voir ${m.title}`} title="Voir la mission"><Icon name="eye" size={18} /></Link>{["DRAFT", "PUBLISHED", "FULL"].includes(m.status) && <Link href={`/recruteur/missions/${m.id}/modifier`} aria-label={`Modifier ${m.title}`} title="Modifier"><Icon name="edit" size={18} /></Link>}<Link href={`/recruteur/candidatures?mission=${m.id}`} aria-label={`Candidatures pour ${m.title}`} title="Candidatures"><Icon name="people" size={18} /></Link>{["DRAFT", "PUBLISHED", "FULL", "CLOSED", "IN_PROGRESS"].includes(m.status) && <div className="rqm-cancel"><ConfirmAction endpoint={`/api/missions/${m.id}`} data={{ status: "CANCELLED" }} label="Annuler" title="Annuler cette mission ?" description="Cette mission ne sera plus disponible. Les candidatures resteront dans votre historique. Cette décision est définitive." danger /></div>}</div>
      </article></li>)}</ul> : <EmptyState title={filtered ? "Aucune mission trouvée" : "Votre prochaine mission commence ici"} action={filtered ? <Link className="rq-button" href={href({ q: "", category: "", city: "", status: "" })}>Réinitialiser les filtres</Link> : <PublishLink />}>{filtered ? "Essayez un autre titre, une autre catégorie, ville ou un autre statut." : "Publiez votre première mission pour recevoir des candidatures et constituer votre équipe."}</EmptyState>}
      {pages > 1 && <nav className="rqm-pagination" aria-label="Pagination des missions">{page > 1 ? <Link className="rq-button" href={href({ page: String(page - 1) })}>Précédent</Link> : <span />}<span>Page {page} / {pages}</span>{page < pages ? <Link className="rq-button" href={href({ page: String(page + 1) })}>Suivant</Link> : <span />}</nav>}
    </section>
  </div>;
}
