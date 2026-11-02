"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/recruiter/Icon";
export default function ReviewForm({ applicationId }: { applicationId: number }) {
  const router = useRouter();
  const [pending, setPending] = useState(false), [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending) return;
    const values = new FormData(event.currentTarget);
    setPending(true); setError("");
    try {
      const response = await fetch(`/api/applications/${applicationId}/reviews`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating: Number(values.get("rating")), comment: values.get("comment") }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "Évaluation impossible"); return; }
      router.refresh();
    } catch { setError("Connexion au serveur impossible"); }
    finally { setPending(false); }
  }
  return <form className="qj-review-form" onSubmit={submit} aria-busy={pending}><fieldset disabled={pending} style={{ border: 0, padding: 0 }}><legend className="sr-only">Évaluer le participant</legend><label className="rq-field"><span><Icon name="star" size={17} />Note</span><select name="rating" defaultValue="5" required>{[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} / 5</option>)}</select></label><label className="rq-field">Commentaire<textarea name="comment" required maxLength={2000} rows={4} /></label></fieldset>{error && <p role="alert" className="rq-error">{error}</p>}<button className="rq-button rq-primary" disabled={pending}><Icon name="star" size={17} />{pending ? "Enregistrement…" : "Publier mon évaluation"}</button></form>;
}
