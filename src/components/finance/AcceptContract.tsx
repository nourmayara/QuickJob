"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AcceptContract({ reference }: { reference: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  return <>
    <button type="button" className="rq-button rq-primary" disabled={pending} onClick={async () => {
      if (pending || !window.confirm("Acceptez-vous les conditions du contrat affiché ?")) return;
      setPending(true);
      setMessage("");
      try {
        const response = await fetch(`/api/finance/contracts/${reference}`, { method: "POST" });
        const result = await response.json();
        if (!response.ok) setMessage(result.error ?? "Acceptation impossible.");
        else { router.refresh(); return; }
      } catch {
        setMessage("Connexion impossible. Réessayez.");
      }
      setPending(false);
    }}>{pending ? "Acceptation…" : "Accepter le contrat"}</button>
    {message && <p className="rq-error" role="alert">{message}</p>}
  </>;
}
