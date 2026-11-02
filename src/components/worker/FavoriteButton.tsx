"use client";
import { useState } from "react";
import Icon from "@/components/recruiter/Icon";
import { useRouter } from "next/navigation";
export default function FavoriteButton({ missionId, initialValue }: { missionId: number; initialValue: boolean }) {
  const router = useRouter();
  const [favorite, setFavorite] = useState(initialValue), [pending, setPending] = useState(false), [error, setError] = useState("");
  return <div><button type="button" className="rq-button wk-favorite" aria-pressed={favorite} disabled={pending} onClick={async () => {
    setPending(true); setError("");
    try {
      const response = await fetch(`/api/travailleur/favoris/${missionId}`, { method: favorite ? "DELETE" : "PUT" });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "Action impossible"); return; }
      setFavorite(!favorite); router.refresh();
    } catch { setError("Connexion au serveur impossible"); }
    finally { setPending(false); }
  }}><Icon name="heart" size={18} />{pending ? "Enregistrement…" : favorite ? "Retirer des favoris" : "Ajouter aux favoris"}</button>{error && <p role="alert" className="rq-error">{error}</p>}</div>;
}
