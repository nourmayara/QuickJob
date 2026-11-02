import prisma from "@/lib/prisma";
import { requirePageRole } from "@/lib/authorization";
import { visibleWorkerMission, workerMissionInclude } from "@/lib/worker-data";
import { EmptyState, PageHeading, Panel } from "@/components/recruiter/ui";
import MissionCard from "@/components/worker/MissionCard";
import FavoriteButton from "@/components/worker/FavoriteButton";
import Pagination from "@/components/Pagination";
import { pageNumber } from "@/lib/recruiter-data";
export default async function FavoritesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const user = await requirePageRole(["TRAVAILLEUR"]);
  const page = pageNumber((await searchParams).page);
  const where = { workerId: user.id };
  const [favorites, total] = await Promise.all([
    prisma.favorite.findMany({ where, include: { mission: { include: workerMissionInclude(user.id) } }, orderBy: { createdAt: "desc" }, take: 20, skip: (page - 1) * 20 }),
    prisma.favorite.count({ where }),
  ]);
  const visible = new Set((await prisma.mission.findMany({ where: { favorites: { some: { workerId: user.id } }, ...visibleWorkerMission(user.id) }, select: { id: true } })).map(m => m.id));
  return <><PageHeading title="Mes favoris" description="Retrouvez les missions enregistrées. Une mission indisponible ne peut plus recevoir de candidature." />{favorites.length ? <div className="wk-missions-grid">{favorites.map(f => visible.has(f.missionId) ? <MissionCard key={f.id} mission={f.mission} /> : <Panel key={f.id} title="Mission indisponible" description="Cette mission n’est plus ouverte ou accessible."><div className="rq-detail"><FavoriteButton missionId={f.missionId} initialValue /></div></Panel>)}</div> : <Panel title="Vos missions enregistrées"><EmptyState icon="briefcase" title="Aucun favori">Ajoutez une mission depuis la recherche ou sa page de détail.</EmptyState></Panel>}<Pagination page={page} total={total} ariaLabel="Pagination des favoris" /></>;
}
