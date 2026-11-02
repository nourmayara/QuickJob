"use client";
import { useState, type FormEvent } from "react";
export default function ReportForm({ missionId, targetUserId }: { missionId?: number; targetUserId?: number }) {
  const [open, setOpen] = useState(false), [pending, setPending] = useState(false), [error, setError] = useState(""), [saved, setSaved] = useState<number | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending) return;
    const data = new FormData(event.currentTarget), kind = String(data.get("kind"));
    setPending(true); setError("");
    try {
      const response = await fetch("/api/signalements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, reason: data.get("reason"), ...(kind === "MISSION" ? { missionId } : { targetUserId, ...(kind === "BEHAVIOR" && missionId ? { missionId } : {}) }) }) });
      const result = await response.json();
      if (!response.ok) { setError(result.error || "Signalement impossible"); return; }
      setSaved(result.id); setOpen(false);
    } catch { setError("Connexion au serveur impossible"); }
    finally { setPending(false); }
  }
  return <section style={{ margin: "20px 0" }} aria-label="Signaler un problème">{!open ? <button className="rq-button" onClick={() => { setOpen(true); setError(""); }}>Signaler un problème</button> : <form className="rq-form" onSubmit={submit}><label className="rq-field">Objet du signalement<select name="kind" disabled={pending}>{missionId && <option value="MISSION">Mission suspecte</option>}{targetUserId && <><option value="PROFILE">Profil problématique</option><option value="BEHAVIOR">Comportement inapproprié</option></>}</select></label><label className="rq-field">Expliquez le problème<textarea name="reason" required minLength={10} maxLength={3000} disabled={pending} /></label><p className="rq-subtle">Votre signalement est transmis à la modération. Il n’est pas publié sur le profil ou la mission.</p><div className="rq-form-actions"><button className="rq-button rq-primary" disabled={pending}>{pending ? "Envoi…" : "Envoyer le signalement"}</button><button type="button" className="rq-button" disabled={pending} onClick={() => setOpen(false)}>Annuler</button></div>{error && <p role="alert" className="rq-error">{error}</p>}</form>}{saved && <p role="status" className="rq-success">Signalement #{saved} enregistré.</p>}</section>;
}
