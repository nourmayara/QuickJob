import prisma from "@/lib/prisma";
import { Panel } from "@/components/recruiter/ui";
export default async function AdminHistory({ type, id }: { type: string; id: number }) {
  const actions = await prisma.adminAction.findMany({ where: { targetType: type, targetId: id }, include: { admin: { select: { firstName: true, name: true } } }, orderBy: { id: "desc" }, take: 20 });
  return <Panel title="Historique des décisions"><div className="rq-detail">{actions.length ? actions.map(a => <div key={a.id} className="rq-notice"><strong>{a.action}</strong><p className="qa-long-text">{a.reason}</p><small>{a.createdAt.toLocaleString("fr-FR", { timeZone: "Africa/Tunis" })} · {a.admin ? `${a.admin.firstName} ${a.admin.name}` : "Administrateur supprimé"}</small></div>) : <p>Aucune décision de modération enregistrée.</p>}</div></Panel>;
}
