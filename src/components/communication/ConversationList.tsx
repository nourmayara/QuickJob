"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/recruiter/Icon";

export type ConversationSummary = {
  id: number;
  personId: number;
  personName: string;
  avatarUrl: string | null;
  lastSeenAt: string | null;
  missionTitle: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unread: number;
};

const ONLINE_WINDOW_MS = 60_000;

export function isRecentlyOnline(value: string | null, now = Date.now()) {
  return !!value && now - new Date(value).getTime() <= ONLINE_WINDOW_MS;
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();
}

function shortTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value), today = new Date();
  return date.toDateString() === today.toDateString()
    ? date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Tunis" })
    : date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", timeZone: "Africa/Tunis" });
}

export function ConversationAvatar({ name, avatarUrl, online = false, size = "normal" }: { name: string; avatarUrl: string | null; online?: boolean; size?: "normal" | "large" }) {
  return <span className={`qj-chat-avatar ${size === "large" ? "is-large" : ""}`} role="img" aria-label={`Avatar de ${name}`} style={avatarUrl ? { backgroundImage: `url(${JSON.stringify(avatarUrl).slice(1, -1)})` } : undefined}>
    {!avatarUrl && initials(name)}
    {online && <i className="qj-online-dot" aria-label="En ligne" />}
  </span>;
}

export default function ConversationList({ conversations, base, page, selectedId }: { conversations: ConversationSummary[]; base: string; page: number; selectedId: number | null }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") router.refresh(); };
    const polling = window.setInterval(refresh, 8_000);
    const clock = window.setInterval(() => setNow(Date.now()), 10_000);
    return () => { window.clearInterval(polling); window.clearInterval(clock); };
  }, [router]);

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("fr");
    if (!needle) return conversations;
    return conversations.filter(item => `${item.personName} ${item.missionTitle} ${item.lastMessage || ""}`.toLocaleLowerCase("fr").includes(needle));
  }, [conversations, query]);

  return <div className="qj-conversation-pane">
    <div className="qj-conversation-heading"><div><span>MESSAGERIE</span><h2>Conversations</h2></div><strong>{conversations.length}</strong></div>
    <label className="qj-conversation-search"><span className="sr-only">Rechercher une conversation</span><Icon name="search" size={17}/><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Rechercher…" autoComplete="off"/></label>
    <ul className="qj-conversation-list" aria-label="Liste des conversations">
      {visible.map(item => {
        const online = isRecentlyOnline(item.lastSeenAt, now);
        return <li key={item.id}><Link href={`${base}?application=${item.id}&page=${page}`} aria-current={selectedId === item.id ? "page" : undefined}>
          <ConversationAvatar name={item.personName} avatarUrl={item.avatarUrl} online={online}/>
          <span className="qj-conversation-copy"><span className="qj-conversation-top"><strong>{item.personName}</strong><time dateTime={item.lastMessageAt || undefined}>{shortTime(item.lastMessageAt)}</time></span><span className="qj-conversation-mission">{item.missionTitle}</span><span className="qj-conversation-preview">{item.lastMessage || "Aucun message pour le moment"}</span></span>
          {item.unread > 0 && <span className="qj-unread-badge" aria-label={`${item.unread} message${item.unread > 1 ? "s" : ""} non lu${item.unread > 1 ? "s" : ""}`}>{item.unread > 99 ? "99+" : item.unread}</span>}
        </Link></li>;
      })}
    </ul>
    {!visible.length && <div className="qj-conversation-empty"><Icon name="search" size={22}/><p>Aucune conversation correspondante.</p></div>}
  </div>;
}
