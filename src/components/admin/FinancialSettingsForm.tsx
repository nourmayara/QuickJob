"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { calculateEngagementAmounts, formatDinars, parseCommissionBps } from "@/lib/financial-amounts";

type Settings = { commissionBps: number; paymentHours: number; revision: number };

export default function FinancialSettingsForm({ settings }: { settings: Settings }) {
  const [saved, setSaved] = useState(false);
  return <>
    {saved && <p className="rq-notice mx-6 mt-4" role="status">Paramètres financiers enregistrés.</p>}
    <SettingsEditor key={settings.revision} settings={settings} onSaved={setSaved} />
  </>;
}

function SettingsEditor({ settings, onSaved }: { settings: Settings; onSaved: (saved: boolean) => void }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [rate, setRate] = useState(String(settings.commissionBps / 100));
  const [paymentHours, setPaymentHours] = useState(settings.paymentHours);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const commissionBps = parseCommissionBps(rate);
  const current = calculateEngagementAmounts(50_000, settings.commissionBps);
  const preview = commissionBps === null ? null : calculateEngagementAmounts(50_000, commissionBps);

  function confirm(event: FormEvent) {
    event.preventDefault();
    if (commissionBps === null || pending) return;
    dialog.current?.showModal();
  }

  async function save() {
    if (commissionBps === null || pending) return;
    dialog.current?.close();
    setPending(true);
    onSaved(false);
    setMessage("");
    try {
      const response = await fetch("/api/admin/finance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commissionBps, paymentHours, revision: settings.revision }),
      });
      if (!response.ok) {
        const result = await response.json();
        setMessage(result.error ?? "Enregistrement impossible.");
        return;
      }
      onSaved(true);
      router.refresh();
    } catch {
      setMessage("Connexion impossible. Réessayez.");
    } finally {
      setPending(false);
    }
  }

  return <form className="rq-form" onSubmit={confirm} aria-busy={pending}>
    <div className="rq-form-grid">
      <label className="rq-field">Commission QuickJob (%)
        <input inputMode="decimal" value={rate} onChange={event => setRate(event.target.value)} required />
      </label>
      <label className="rq-field">Délai après le Check-out (heures)
        <input type="number" min={1} max={8760} required value={paymentHours} onChange={event => setPaymentHours(event.target.valueAsNumber || 0)} />
      </label>
    </div>
    <div className="rq-notice" aria-live="polite">
      <div>
        <p>Commission actuelle {settings.commissionBps / 100} % · {formatDinars(current.commissionMillimes)} sur {formatDinars(current.workerMillimes)}</p>
        {preview ? <>
          <p>Nouvelle commission {formatDinars(preview.commissionMillimes)} · Total recruteur {formatDinars(preview.totalMillimes)}</p>
          <p>Rémunération du travailleur {formatDinars(preview.workerMillimes)}</p>
        </> : <p>Saisissez un taux compris entre 0 et 100 % avec deux décimales au maximum.</p>}
      </div>
    </div>
    {message && <p className="rq-error" role="alert">{message}</p>}
    <button className="rq-button rq-primary" disabled={pending || commissionBps === null}>{pending ? "Enregistrement…" : "Enregistrer les modifications"}</button>
    <dialog ref={dialog} className="m-auto w-[min(32rem,calc(100%-2rem))] rounded-2xl border border-violet-100 bg-white p-6 shadow-xl backdrop:bg-slate-900/40" aria-labelledby="financial-confirm-title">
      <h2 id="financial-confirm-title" className="mb-3 font-semibold">Appliquer les nouveaux paramètres ?</h2>
      <p>Taux de {commissionBps === null ? "" : commissionBps / 100} %, délai de paiement de {paymentHours} h après le Check-out.</p>
      <div className="rq-form-actions">
        <button type="button" className="rq-button" onClick={() => dialog.current?.close()}>Annuler</button>
        <button type="button" className="rq-button rq-primary" onClick={save}>Confirmer</button>
      </div>
    </dialog>
  </form>;
}
