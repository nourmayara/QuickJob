"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
export default function ModerationForm({ endpoint, mode, status }: { endpoint: string; mode: "mission" | "report"; status?: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false), [pending, setPending] = useState(false), [error, setError] = useState(""), [saved, setSaved] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending) return;
    if (!confirm) { setConfirm(true); return; }
    const values = new FormData(event.currentTarget);
    const body = mode === "mission" ? { action: "MODERATE", reason: values.get("reason") } : { status: values.get("status"), resolution: values.get("reason"), expectedStatus: status };
    setPending(true); setError(""); setSaved(false);
    try {
      const response = await fetch(endpoint, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "Action impossible"); return; }
      setSaved(true); setConfirm(false); router.refresh();
    } catch { setError("Connexion au serveur impossible"); }
    finally { setPending(false); }
  }
  return <form className="rq-form" onSubmit={submit} aria-busy={pending}><fieldset disabled={pending} style={{ border: 0, padding: 0 }}><legend className="sr-only">Décision de modération</legend>{mode === "report" && <label className="rq-field">Nouveau statut<select name="status" defaultValue={status === "NOUVEAU" ? "EN_COURS" : "RESOLU"} onChange={() => setConfirm(false)}>{status === "NOUVEAU" && <option value="EN_COURS">En cours</option>}<option value="RESOLU">Résolu</option><option value="REJETE">Rejeté</option></select></label>}<label className="rq-field">Motif de la décision<textarea name="reason" minLength={10} maxLength={2000} required onChange={() => setConfirm(false)} /></label>{confirm && <p className="rq-notice">{mode === "mission" ? "Confirmez le masquage. La mission ne sera plus disponible ; ses candidatures et échanges seront conservés." : "Confirmez le statut et le motif. Les décisions finales ne pourront plus être modifiées."}</p>}<div className="rq-form-actions"><button className={`rq-button ${mode === "mission" ? "rq-danger" : "rq-primary"}`} disabled={pending}>{pending ? "Enregistrement…" : confirm ? "Confirmer la décision" : mode === "mission" ? "Masquer la mission" : "Enregistrer le traitement"}</button>{confirm && <button className="rq-button" type="button" onClick={() => setConfirm(false)}>Annuler</button>}</div></fieldset>{error && <p className="rq-error" role="alert">{error}</p>}{saved && <p className="rq-success" role="status">Décision enregistrée.</p>}</form>;
}
