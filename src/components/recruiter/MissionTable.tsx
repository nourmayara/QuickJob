import type { Prisma } from "@prisma/client";
import type { missionInclude } from "@/lib/recruiter-data";
import { Badge, EmptyState, formatDate } from "./ui";
import MissionActions from "./MissionActions";
import MissionArtwork from "@/components/worker/MissionArtwork";

export default function MissionTable({ missions, filtered = false }: { missions: Prisma.MissionGetPayload<{ include: typeof missionInclude }>[]; filtered?: boolean }) {
  if (!missions.length) return <EmptyState title={filtered ? "Aucune mission trouvée" : "Votre prochaine mission commence ici"}>{filtered ? "Essayez un autre titre ou un autre statut." : "Publiez votre première mission pour recevoir des candidatures et constituer votre équipe."}</EmptyState>;
  return <div className="rq-table-scroll"><table className="rq-table"><thead><tr><th scope="col">Mission</th><th scope="col">Catégorie</th><th scope="col">Date</th><th scope="col">Localisation</th><th scope="col">Candidatures</th><th scope="col">Places</th><th scope="col">Statut</th><th scope="col">Actions</th></tr></thead><tbody>{missions.map(m => <tr key={m.id}><td><div className="rq-mission-table-title"><MissionArtwork category={m.category} /><div>{m.title}<small>Mission #{m.id}</small></div></div></td><td>{m.category || "À préciser"}</td><td>{formatDate(m.date)}</td><td>{m.city || "À préciser"}</td><td>{m._count.applications}</td><td>{m.applications.length} / {m.capacity}</td><td><Badge status={m.status} /></td><td><MissionActions id={m.id} status={m.status} compact /></td></tr>)}</tbody></table></div>;
}
