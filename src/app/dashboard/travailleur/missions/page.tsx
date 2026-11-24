import prisma from "@/lib/prisma";
import { requirePageRole } from "@/lib/authorization";
import { workerSearchWhere, workerMissionInclude } from "@/lib/worker-data";
import { workerSearchSchema } from "@/lib/worker-validation";
import { activeCategories } from "@/lib/category-service";
import Link from "next/link";
import { EmptyState, PageHeading } from "@/components/recruiter/ui";
import MissionCard from "@/components/worker/MissionCard";
import { recommendMissionsForWorker } from "@/lib/matching-service";
import AutoFilterForm from "@/components/filters/AutoFilterForm";
import Icon from "@/components/recruiter/Icon";
import "./missions-marketplace.css";

export default async function WorkerMissionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requirePageRole(["TRAVAILLEUR"]);
  const params = await searchParams;
  const tab = params.tab === "recommended" ? "recommended" : "all";
  const parsed = workerSearchSchema.safeParse(params);
  const input = parsed.success ? parsed.data : workerSearchSchema.parse({});
  const categories = (await activeCategories()).map(c => c.name);
  if (input.category && !categories.includes(input.category)) categories.push(input.category);
  const where = workerSearchWhere(input);
  const [missions, count] = tab === "all" && parsed.success ? await Promise.all([
    prisma.mission.findMany({ where, include: workerMissionInclude(user.id), orderBy: { createdAt: "desc" }, take: 12, skip: (input.page - 1) * 12 }),
    prisma.mission.count({ where }),
  ]) : [[], 0];
  const recommendations = tab === "recommended" ? await recommendMissionsForWorker(user.id, 20) : [];
  const href = (page: number) => `?${new URLSearchParams(Object.fromEntries(Object.entries({ ...input, page }).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)])))}`;
  return <>
    <PageHeading title="Trouver une mission" description="Explorez les opportunités QuickJob qui correspondent à votre rythme." />
    <nav className="wk-mission-tabs" aria-label="Types de missions">
      <Link href="/dashboard/travailleur/missions" aria-current={tab === "all" ? "page" : undefined}>Toutes les missions</Link>
      <Link href="?tab=recommended" aria-current={tab === "recommended" ? "page" : undefined}>Recommandées pour vous</Link>
    </nav>
    {tab === "all" ? <div className="wk-marketplace wk-marketplace-unified">
      <AutoFilterForm key={JSON.stringify(input)} resetHref="/dashboard/travailleur/missions" ariaLabel="Filtrer les missions disponibles">
        <label className="qj-filter-field qj-filter-search"><span>Recherche</span><div><Icon name="search" size={18}/><input type="search" name="q" defaultValue={input.q} maxLength={160} placeholder="Un titre, un mot-clé…" /></div></label>
        <label className="qj-filter-field"><span>Ville</span><input name="city" defaultValue={input.city} maxLength={100} placeholder="Toutes les villes" /></label>
        <label className="qj-filter-field"><span>Catégorie</span><select name="category" defaultValue={input.category}><option value="">Toutes les catégories</option>{categories.map(c => <option key={c}>{c}</option>)}</select></label>
        <label className="qj-filter-field"><span>Date de mission</span><input name="date" type="date" defaultValue={input.date} /></label>
        <label className="qj-filter-field"><span>Minimum (TND)</span><input name="payMin" type="number" min={0} max={1000000} step="0.001" defaultValue={input.payMin ?? ""} placeholder="Sans minimum" /></label>
        <label className="qj-filter-field"><span>Maximum (TND)</span><input name="payMax" type="number" min={0} max={1000000} step="0.001" defaultValue={input.payMax ?? ""} placeholder="Sans maximum" /></label>
        <p className="qj-filter-note">Rémunération totale par travailleur et par mission. Horaires en Tunisie.</p>
      </AutoFilterForm>
      <section className="wk-marketplace-results" aria-label="Missions disponibles">
        {!parsed.success && <p className="rq-error" role="alert">{parsed.error.issues[0].message}</p>}
        <div className="wk-marketplace-count"><span>QUICKJOB / OPPORTUNITÉS</span><strong>{count} mission{count > 1 ? "s" : ""} disponible{count > 1 ? "s" : ""}</strong></div>
        {missions.length ? <div className="wk-missions-grid wk-compact-mission-grid">{missions.map(m => <MissionCard key={m.id} mission={m} compact />)}</div> : <div className="rq-panel"><EmptyState icon="search" title="Aucune mission à afficher">{parsed.success ? "Aucune mission publiée ne correspond à votre recherche. Vous pouvez ajuster les filtres ou revenir plus tard." : "Corrigez les filtres pour afficher les missions disponibles."}</EmptyState></div>}
        {count > 12 && <div className="rq-pagination">{input.page > 1 ? <Link className="rq-button" href={href(input.page - 1)}>Précédent</Link> : <span />}<span>Page {input.page} / {Math.ceil(count / 12)}</span>{input.page * 12 < count && <Link className="rq-button" href={href(input.page + 1)}>Suivant</Link>}</div>}
      </section>
    </div> : <section className="wk-recommended-tab" aria-labelledby="recommended-tab-title">
      <div className="wk-marketplace-count"><span>SÉLECTION IA PERSONNALISÉE</span><strong id="recommended-tab-title">{recommendations.length} mission{recommendations.length > 1 ? "s" : ""} recommandée{recommendations.length > 1 ? "s" : ""}</strong></div>
      {recommendations.length ? <div className="wk-missions-grid wk-compact-mission-grid">{recommendations.map(m => <MissionCard key={m.id} mission={m} match={m.match} compact />)}</div> : <div className="rq-panel"><EmptyState icon="search" title="Aucune recommandation compatible">Ajoutez vos compétences et disponibilités pour améliorer le matching.</EmptyState></div>}
    </section>}
  </>;
}
