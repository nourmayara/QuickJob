"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function QuickApplyButton({ missionId }: { missionId: number }) {
  const router = useRouter();
  const [pending, setPending] = useState(false), [error, setError] = useState("");
  async function apply() {
    if (pending) return;
    setPending(true); setError("");
    try {
      const response = await fetch(`/api/missions/${missionId}/applications`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "Candidature impossible"); router.refresh(); return; }
      router.push(`/dashboard/travailleur/candidatures/${data.id}`);
    } catch { setError("Connexion impossible"); }
    finally { setPending(false); }
  }
  return <span className="wk-quick-apply"><button type="button" className="rq-button rq-primary" onClick={apply} disabled={pending}>{pending ? "Envoi…" : "Postuler"}</button>{error && <small role="alert">{error}</small>}</span>;
}
