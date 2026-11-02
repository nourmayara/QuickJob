"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/recruiter/Icon";
type Message = { id: number; senderId: number; body: string; createdAt: string; readAt: string | null };
export default function MessageThread({ applicationId, userId, initialMessages, initialHasOlder }: { applicationId: number; userId: number; initialMessages: Message[]; initialHasOlder: boolean }) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages), [hasOlder, setHasOlder] = useState(initialHasOlder), [loading, setLoading] = useState(false), [pending, setPending] = useState(false), [error, setError] = useState("");
  const endpoint = `/api/applications/${applicationId}/messages`;
  const load = useCallback(async (before?: number) => {
    setLoading(true);
    try {
      const response = await fetch(endpoint + (before ? `?before=${before}` : ""), { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "Lecture impossible"); return; }
      setMessages(previous => before ? [...data.messages, ...previous] : data.messages); setHasOlder(data.hasOlder);
      const ids = (data.messages as Message[]).filter(m => m.senderId !== userId && !m.readAt).map(m => m.id);
      if (ids.length) {
        const marked = await fetch(endpoint, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
        if (!marked.ok) setError("Impossible de mettre à jour l’état de lecture. Actualisez la conversation.");
        else router.refresh();
      }
    } catch { setError("Connexion au serveur impossible"); }
    finally { setLoading(false); }
  }, [endpoint, userId, router]);
  useEffect(() => {
    const ids = initialMessages.filter(m => m.senderId !== userId && !m.readAt).map(m => m.id);
    if (!ids.length) return;
    const controller = new AbortController();
    void fetch(endpoint, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }), signal: controller.signal }).then(response => {
      if (response.ok) router.refresh(); else setError("Impossible de mettre à jour l’état de lecture");
    }).catch(() => { if (!controller.signal.aborted) setError("Connexion au serveur impossible"); });
    return () => controller.abort();
  }, [initialMessages, userId, endpoint, router]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending) return;
    const form = event.currentTarget, body = String(new FormData(form).get("body") || "");
    setPending(true); setError("");
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }) });
      const result = await response.json();
      if (!response.ok) { setError(result.error || "Envoi impossible"); return; }
      form.reset(); await load();
    } catch { setError("Connexion au serveur impossible"); }
    finally { setPending(false); }
  }
  return <div className="rq-detail"><button className="rq-button" type="button" disabled={loading || pending} onClick={() => { setError(""); void load(); }}>Actualiser les messages</button>{error && <p role="alert" className="rq-error">{error}</p>}{loading ? <p role="status">Chargement des messages…</p> : <>{hasOlder && <button className="rq-button" type="button" onClick={() => void load(messages[0]?.id)}>Charger les messages précédents</button>}<ol className="qj-message-history" aria-label="Historique de la conversation">{messages.map(m => <li key={m.id} className={m.senderId === userId ? "qj-message is-own" : "qj-message"}><strong>{m.senderId === userId ? "Vous" : "Votre interlocuteur"}</strong><p>{m.body}</p><small><time dateTime={m.createdAt}>{new Date(m.createdAt).toLocaleString("fr-FR", { timeZone: "Africa/Tunis" })}</time> · Tunisie{m.senderId === userId && ` · ${m.readAt ? "Lu" : "Envoyé"}`}</small></li>)}</ol>{messages.length === 0 && <p className="rq-notice">Aucun message pour cette mission. Commencez la conversation.</p>}<form onSubmit={submit} className="qj-message-form" aria-busy={pending}><label className="rq-field">Votre message<textarea name="body" required maxLength={4000} rows={4} disabled={pending} /></label><button className="rq-button rq-primary" disabled={pending}><Icon name="send" size={17} />{pending ? "Envoi…" : "Envoyer le message"}</button></form></>}</div>;
}
