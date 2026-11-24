import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { participantWhere, threadApplication, threadMessages, type CommunicationActor } from "@/lib/communication-service";
import { WorkerError } from "@/lib/worker-service";
import { PageHeading } from "@/components/recruiter/ui";
import Icon from "@/components/recruiter/Icon";
import MessageThread from "./MessageThread";
import ConversationList, { type ConversationSummary } from "./ConversationList";
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
  const [rows, total, { selected, initial }] = await Promise.all([
    prisma.application.findMany({
      where: conversationWhere,
      select: {
        id: true,
        worker: { select: { id: true, name: true, firstName: true, avatarUrl: true, lastSeenAt: true } },
        mission: { select: { title: true, recruiter: { select: { id: true, name: true, firstName: true, avatarUrl: true, lastSeenAt: true } } } },
        messages: { select: { body: true, createdAt: true, attachments: { select: { kind: true }, take: 1 } }, orderBy: { id: "desc" }, take: 1 },
        _count: { select: { messages: { where: { senderId: { not: user.id }, readAt: null } } } },
      },
      orderBy: { id: "desc" }, take: 20, skip: (page - 1) * 20,
    }),
    prisma.application.count({ where: conversationWhere }),
    selectedThread(),
  ]);

  const conversations: ConversationSummary[] = rows.map(row => {
    const person = user.role === "TRAVAILLEUR" ? row.mission.recruiter : row.worker;
    return {
      id: row.id,
      personId: person.id,
      personName: `${person.firstName} ${person.name}`.trim(),
      avatarUrl: person.avatarUrl,
      lastSeenAt: person.lastSeenAt?.toISOString() || null,
      missionTitle: row.mission.title,
      lastMessage: row.messages[0]?.body || ({ IMAGE: "📷 Photo", VIDEO: "🎬 Vidéo", DOCUMENT: "📄 Document", AUDIO: "🎙️ Message vocal", LOCATION: "📍 Localisation", CONTACT: "👤 Contact" }[row.messages[0]?.attachments[0]?.kind || ""] ?? null),
      lastMessageAt: row.messages[0]?.createdAt.toISOString() || null,
      unread: row._count.messages,
    };
  }).sort((a, b) => (b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0) - (a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0) || b.id - a.id);

  const selectedPerson = selected ? (user.role === "TRAVAILLEUR" ? selected.mission.recruiter : selected.worker) : null;
  return <div className="qj-messages-page">
    <PageHeading title="Messages" description="Échangez en temps réel avec vos interlocuteurs pour chaque mission acceptée." />
    <div className={`qj-messenger ${selected ? "has-selection" : ""}`}>
      <aside className="qj-conversation-column" aria-label="Conversations">
        <ConversationList conversations={conversations} base={base} page={page} selectedId={selected?.id ?? null}/>
        <Pagination page={page} total={total} query={{ application }} ariaLabel="Pagination des conversations" />
      </aside>
      <section className="qj-chat-pane" aria-label={selected ? `Conversation concernant ${selected.mission.title}` : "Messagerie"}>
        {selected && selectedPerson ? <MessageThread
          key={selected.id}
          applicationId={selected.id}
          userId={user.id}
          base={base}
          person={{ name: `${selectedPerson.firstName} ${selectedPerson.name}`.trim(), missionTitle: selected.mission.title, avatarUrl: selectedPerson.avatarUrl, lastSeenAt: selectedPerson.lastSeenAt?.toISOString() || null }}
          initialHasOlder={initial.hasOlder}
          initialMessages={initial.messages.map(message => ({ ...message, createdAt: message.createdAt.toISOString(), readAt: message.readAt?.toISOString() || null }))}
        /> : <div className="qj-chat-welcome"><span className="qj-chat-welcome-icon"><Icon name="message" size={38}/></span><p>QUICKJOB MESSAGERIE</p><h2>{conversations.length ? "Vos échanges, au même endroit" : "Aucune conversation"}</h2><span>{conversations.length ? "Sélectionnez une conversation pour consulter son historique et envoyer un message." : "Les conversations deviennent disponibles après l’acceptation d’une candidature."}</span></div>}
      </section>
    </div>
  </div>;
}
