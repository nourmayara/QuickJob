import prisma from "@/lib/prisma";
import { requirePageRole } from "@/lib/authorization";
import { workerSearchWhere, workerMissionInclude } from "@/lib/worker-data";
import { workerSearchSchema } from "@/lib/worker-validation";
import { activeCategories } from "@/lib/category-service";
import Link from "next/link";
import { EmptyState, PageHeading } from "@/components/recruiter/ui";
import MissionCard from "@/components/worker/MissionCard";
import { recommendMissionsForWorker } from "@/lib/matching-service";

export default async function WorkerMissionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requirePageRole(["TRAVAILLEUR"]);
  const parsed = workerSearchSchema.safeParse(await searchParams);
  const input = parsed.success ? parsed.data : workerSearchSchema.parse({});
  const categories = (await activeCategories()).map(c => c.name);
  if (input.category && !categories.includes(input.category)) categories.push(input.category);
  const where = workerSearchWhere(input);
  const recommendationsPromise = recommendMissionsForWorker(user.id, 6);
  const [missions, count, recommendations] = parsed.success ? await Promise.all([
    prisma.mission.findMany({ where, include: workerMissionInclude(user.id), orderBy: { createdAt: "desc" }, take: 20, skip: (input.page - 1) * 20 }),
    prisma.mission.count({ where }),
    recommendationsPromise,
  ]) : [[], 0, await recommendationsPromise];
  const href = (page: number) => `?${new URLSearchParams(Object.fromEntries(Object.entries({ ...input, page }).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)])))}`;
  return <>
    <PageHeading eyebrow="VOTRE PROCHAINE OPPORTUNITÉ" title="Trouver une mission" description="Des missions ponctuelles publiées par les recruteurs QuickJob, à votre rythme." />
    <section className="wk-recommendations wk-recommendations-market" aria-labelledby="missions-recommendations"><div className="rq-panel-heading"><div><span className="wk-aurora-kicker">SÉLECTION PERSONNALISÉE</span><h2 id="missions-recommendations">Missions recommandées pour vous</h2><p>Les missions expirées, complètes ou incompatibles avec une contrainte obligatoire sont exclues.</p></div></div>{recommendations.length ? <div className="wk-missions-grid">{recommendations.map(m => <MissionCard key={m.id} mission={m} match={m.match} />)}</div> : <div className="rq-panel"><EmptyState icon="search" title="Aucune recommandation compatible">Ajoutez vos compétences et disponibilités pour améliorer le matching.</EmptyState></div>}</section>
    <div className="wk-marketplace">
      <aside className="wk-marketplace-filters" aria-label="Filtres de recherche">
        <form key={JSON.stringify(input)} method="GET" className="wk-search rq-panel">
          <div className="wk-search-intro"><span>01 / EXPLORER</span><h2>Affinez votre recherche</h2><p>La bonne mission est peut-être tout près.</p></div>
          <div className="wk-search-main"><label className="rq-field">Recherche<input name="q" defaultValue={input.q} maxLength={160} placeholder="Un titre, un mot-clé…" /></label><label className="rq-field">Ville<input name="city" defaultValue={input.city} maxLength={100} placeholder="Toutes les villes" /></label></div>
          <div className="wk-search-filters"><label className="rq-field">Catégorie<select name="category" defaultValue={input.category}><option value="">Toutes les catégories</option>{categories.map(c => <option key={c}>{c}</option>)}</select></label><label className="rq-field">Date de mission<input name="date" type="date" defaultValue={input.date} /></label><label className="rq-field">Minimum (TND)<input name="payMin" type="number" min={0} max={1000000} step="0.001" defaultValue={input.payMin ?? ""} placeholder="Sans minimum" /></label><label className="rq-field">Maximum (TND)<input name="payMax" type="number" min={0} max={1000000} step="0.001" defaultValue={input.payMax ?? ""} placeholder="Sans maximum" /></label></div>
          <div className="wk-search-actions"><button className="rq-button rq-primary">Rechercher</button><Link href="/dashboard/travailleur/missions" className="rq-link">Réinitialiser les filtres</Link></div>
          <p className="rq-subtle">Rémunération totale par travailleur et par mission. Horaires en Tunisie.</p>
        </form>
      </aside>
      <section className="wk-marketplace-results" aria-label="Missions disponibles">
        {!parsed.success && <p className="rq-error" role="alert">{parsed.error.issues[0].message}</p>}
        <div className="wk-marketplace-count"><span>QUICKJOB / OPPORTUNITÉS</span><strong>{count} mission{count > 1 ? "s" : ""} disponible{count > 1 ? "s" : ""}</strong></div>
        {missions.length ? <div className="wk-missions-grid">{missions.map(m => <MissionCard key={m.id} mission={m} />)}</div> : <div className="rq-panel"><EmptyState icon="search" title="Aucune mission à afficher">{parsed.success ? "Aucune mission publiée ne correspond à votre recherche. Vous pouvez ajuster les filtres ou revenir plus tard." : "Corrigez les filtres pour afficher les missions disponibles."}</EmptyState></div>}
        {count > 20 && <div className="rq-pagination">{input.page > 1 ? <Link className="rq-button" href={href(input.page - 1)}>Précédent</Link> : <span />}<span>Page {input.page} / {Math.ceil(count / 20)}</span>{input.page * 20 < count && <Link className="rq-button" href={href(input.page + 1)}>Suivant</Link>}</div>}
      </section>
    </div>
  </>;
}
