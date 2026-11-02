"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function ReplacementOfferButton({ cancelledApplicationId, candidateId }: { cancelledApplicationId: number; candidateId: number }) {
  const router = useRouter(); const [pending, setPending] = useState(false), [message, setMessage] = useState("");
  async function propose() { if (pending) return; setPending(true); setMessage(""); try { const response = await fetch("/api/recruteur/remplacements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cancelledApplicationId, candidateId }) }); const data = await response.json(); setMessage(response.ok ? "Proposition envoyée. En attente de la réponse du candidat." : data.error || "Proposition impossible"); if (response.ok) router.refresh(); } catch { setMessage("Connexion impossible"); } finally { setPending(false); } }
  return <div className="rq-replacement-action"><button type="button" className="rq-button rq-primary" disabled={pending} onClick={propose}>{pending ? "Envoi…" : "Proposer le remplacement"}</button>{message && <small role="status">{message}</small>}</div>;
}
