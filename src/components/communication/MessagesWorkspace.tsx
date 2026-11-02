import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { participantWhere, threadApplication, threadMessages, type CommunicationActor } from "@/lib/communication-service";
import { WorkerError } from "@/lib/worker-service";
import { PageHeading, Panel, EmptyState } from "@/components/recruiter/ui";
import MessageThread from "./MessageThread";
import Pagination from "@/components/Pagination";
import "./communication.css";
export default async function MessagesWorkspace({ user, application, page = 1 }: { user: CommunicationActor; application?: string; page?: number }) {
  const base = user.role === "TRAVAILLEUR" ? "/dashboard/travailleur/messages" : "/recruteur/messages";
  const id = application === undefined ? null : Number(application);
  if (id !== null && (!Number.isSafeInteger(id) || id <= 0)) notFound();
  async function selectedThread() {
    if (id === null) return { selected: null, initial: { messages: [], hasOlder: false } };
    try {
      const selected = await threadApplication(user, id);
      return { selected, initial: await threadMessages(user, id) };
    } catch (error) { if (error instanceof WorkerError) notFound(); throw error; }
  }
  const conversationWhere = { ...participantWhere(user), status: "ACCEPTED" as const };
  const [conversations, total, { selected, initial }] = await Promise.all([
    prisma.application.findMany({ where: conversationWhere, select: { id: true, worker: { select: { name: true, firstName: true } }, mission: { select: { title: true, recruiter: { select: { name: true, firstName: true } } } }, _count: { select: { messages: { where: { senderId: { not: user.id }, readAt: null } } } } }, orderBy: { id: "desc" }, take: 20, skip: (page - 1) * 20 }),
    prisma.application.count({ where: conversationWhere }),
    selectedThread(),
  ]);
  return <><PageHeading title="Messages" description="Échangez après acceptation de la candidature. Chaque conversation est liée à une mission. Utilisez Actualiser pour recevoir les nouveaux messages." />{conversations.length ? <><div className="qj-messages"><Panel title="Mes conversations"><ul className="qj-conversation-list">{conversations.map(a => { const person = user.role === "TRAVAILLEUR" ? a.mission.recruiter : a.worker; return <li key={a.id}><Link href={`${base}?application=${a.id}&page=${page}`} aria-current={selected?.id === a.id ? "page" : undefined}><strong>{a.mission.title}</strong><span>{person.firstName} {person.name}</span><small>{a._count.messages} message(s) non lu(s)</small></Link></li>; })}</ul></Panel><Panel title={selected ? selected.mission.title : "Choisir une conversation"}>{selected ? <MessageThread key={selected.id} applicationId={selected.id} userId={user.id} initialHasOlder={initial.hasOlder} initialMessages={initial.messages.map(m => ({ ...m, createdAt: m.createdAt.toISOString(), readAt: m.readAt?.toISOString() || null }))} /> : <div className="rq-detail">Sélectionnez une mission pour ouvrir son historique.</div>}</Panel></div><Pagination page={page} total={total} query={{ application }} ariaLabel="Pagination des conversations" /></> : <Panel title="Messagerie"><EmptyState icon="mail" title="Aucune conversation">Les conversations sont disponibles après l’acceptation d’une candidature.</EmptyState></Panel>}</>;
}
