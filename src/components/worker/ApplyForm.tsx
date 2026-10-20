"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { applicationInput } from "@/lib/worker-validation";
export default function ApplyForm({ missionId }: { missionId: number }) {
  const router = useRouter();
  const [pending, setPending] = useState(false), [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending) return;
    const input = applicationInput.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
    if (!input.success) { setError(input.error.issues[0].message); return; }
    setError(""); setPending(true);
    try {
      const response = await fetch(`/api/missions/${missionId}/applications`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input.data) });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "Candidature impossible"); router.refresh(); return; }
      router.push(`/dashboard/travailleur/candidatures/${data.id}`); router.refresh();
    } catch { setError("Connexion au serveur impossible. Réessayez."); }
    finally { setPending(false); }
  }
  return <form className="wk-apply-form" onSubmit={submit} aria-busy={pending}><label className="rq-field">Message au recruteur (facultatif)<textarea name="message" maxLength={2000} rows={5} disabled={pending} placeholder="Présentez votre motivation ou une expérience utile pour cette mission…" /><small>2 000 caractères maximum. Votre profil professionnel accompagne votre candidature.</small></label>{error && <p className="rq-error" role="alert">{error}</p>}<button className="rq-button rq-primary wk-full-button" disabled={pending}>{pending ? "Envoi en cours…" : "Postuler"}</button><p className="rq-subtle" style={{ marginTop: 12 }}>Vous pourrez suivre la réponse du recruteur dans Mes candidatures.</p></form>;
}
