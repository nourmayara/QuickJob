"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import SoftIcon from "@/components/SoftIcon";
import type { IconName } from "@/components/recruiter/Icon";
import "./communication.css";

function iconFor(message: string): IconName {
  const value = message.toLocaleLowerCase("fr-FR");
  if (/accept|approuv|valid|vérifi/.test(value)) return "check";
  if (/message|conversation/.test(value)) return "message";
  if (/mission|candidature/.test(value)) return "briefcase";
  if (/profil|compte/.test(value)) return "user";
  return "shield";
}

export default function NotificationCenter({ items, unread }: { items: { id: number; message: string; createdAt: string; readAt: string | null }[]; unread: number }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function mark(id?: number) {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(id ? { id } : { all: true }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "Mise à jour impossible"); return; }
      window.dispatchEvent(new Event("quickjob:notifications"));
      router.refresh();
    } catch { setError("Connexion au serveur impossible"); }
    finally { setPending(false); }
  }
  return <div className="rq-detail">
    <p>{unread} notification(s) non lue(s)</p>
    {unread > 0 && <button className="rq-button" disabled={pending} onClick={() => void mark()}>Tout marquer comme lu</button>}
    {error && <p role="alert" className="rq-error">{error}</p>}
    {items.length === 0 && <p className="rq-notice">Aucune notification pour le moment.</p>}
    <ul className="qj-notifications">{items.map(n => <li key={n.id} className={n.readAt ? "is-read" : "is-unread"}>
      <SoftIcon name={iconFor(n.message)} size={25} />
      <div className="qj-notification-body"><p>{n.message}</p><small><time dateTime={n.createdAt}>{new Date(n.createdAt).toLocaleString("fr-FR", { timeZone: "Africa/Tunis" })}</time> · Tunisie · {n.readAt ? "Lue" : "Non lue"}</small>{!n.readAt && <button className="rq-button" disabled={pending} onClick={() => void mark(n.id)}>Marquer comme lu</button>}</div>
    </li>)}</ul>
  </div>;
}
