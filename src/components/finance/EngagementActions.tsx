"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

type Action = "check-in" | "check-out" | "cancel" | "dispute" | "resolve";
const labels: Record<Action | "report-check-out-problem", string> = {
  "check-in": "Confirmer l’arrivée (Check-in)",
  "check-out": "Effectuer le Check-out",
  "report-check-out-problem": "Signaler un problème",
  cancel: "Annuler l’engagement",
  dispute: "Ouvrir un litige",
  resolve: "Enregistrer la décision",
};

export default function EngagementActions({ id, action }: { id: number; action: Action }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [reporting, setReporting] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>, command: Action | "report-check-out-problem") {
    event.preventDefault();
    if (pending) return;
    if (action === "cancel" && !window.confirm("Annuler cet engagement ?")) return;
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/finance/engagements/${id}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fields, action: command }),
      });
      if (response.ok) { dialog.current?.close(); router.refresh(); return; }
      const result = await response.json();
      setError(result.error ?? "Action impossible.");
    } catch {
      setError("Connexion impossible. Réessayez.");
    }
    setPending(false);
  }
  if (action === "check-out") return <div className="mt-3">
    <button type="button" className="rq-button" disabled={pending} onClick={() => {
      setReporting(false);
      setError("");
      dialog.current?.showModal();
    }}>{labels[action]}</button>
    <dialog ref={dialog} aria-label="Check-out" onCancel={event => { if (pending) event.preventDefault(); }}
      className="m-auto w-[min(32rem,calc(100%-2rem))] rounded-2xl border border-violet-100 bg-white p-6 shadow-xl backdrop:bg-slate-900/40">
      <form className="space-y-3" onSubmit={event => submit(event, reporting ? "report-check-out-problem" : "check-out")}>
        {reporting ? <label className="rq-field">Décrivez le problème
          <textarea name="reason" minLength={10} maxLength={3000} required />
        </label> : <p>Confirmez-vous que le travailleur a terminé sa mission et que le travail a été correctement réalisé ?</p>}
        {error && <p role="alert" className="rq-error">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <button type="button" className="rq-button" disabled={pending} onClick={() => dialog.current?.close()}>Annuler</button>
          {!reporting && <button type="button" className="rq-button" disabled={pending} onClick={() => {
            setError("");
            setReporting(true);
          }}>{labels["report-check-out-problem"]}</button>}
          <button className="rq-button rq-primary" disabled={pending}>
            {pending ? "Enregistrement…" : reporting ? "Ouvrir le litige" : "Confirmer le Check-out"}
          </button>
        </div>
      </form>
    </dialog>
  </div>;
  return <form onSubmit={event => submit(event, action)} className="mt-3 space-y-2">
    {action === "resolve" && <label className="rq-field">Décision
      <select name="decision"><option value="RESUME">Reprendre le parcours</option><option value="NO_WORK">Clore pour absence de prestation</option></select>
    </label>}
    {(action === "dispute" || action === "resolve") && <label className="rq-field">Motif
      <textarea name="reason" minLength={10} maxLength={3000} required />
    </label>}
    <button className="rq-button" disabled={pending}>{pending ? "Enregistrement…" : labels[action]}</button>
    {error && <p role="alert" className="rq-error">{error}</p>}
  </form>;
}
