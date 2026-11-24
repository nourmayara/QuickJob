"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function RefundForm({ id, existingReason }: { id: string; existingReason?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !window.confirm("Lancer un remboursement intégral en mode test ?")) return;
    const reason = new FormData(event.currentTarget).get("reason");
    setBusy(true);
    try {
      const response = await fetch("/api/admin/finance/refunds", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: id, reason }),
      });
      const result = await response.json();
      setMessage(response.ok ? "Demande envoyée. Confirmation du webhook en attente." : result.error ?? "Remboursement indisponible.");
      router.refresh();
    } catch {
      setMessage("Connexion impossible. Réessayez.");
    } finally {
      setBusy(false);
    }
  }
  return <form onSubmit={submit} className="mt-4 space-y-2">
    <label className="rq-field">Motif du remboursement intégral
      <textarea name="reason" required minLength={10} maxLength={3000} defaultValue={existingReason} readOnly={Boolean(existingReason)} />
    </label>
    <button className="rq-button" disabled={busy}>{busy ? "Envoi…" : existingReason ? "Réessayer la demande" : "Rembourser en mode test"}</button>
    {message && <p className="text-sm" role="status">{message}</p>}
  </form>;
}
