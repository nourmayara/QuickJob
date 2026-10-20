"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function logout() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error();
      router.push("/login"); router.refresh();
    } catch { setError("Déconnexion impossible. Réessayez."); }
    finally { setLoading(false); }
  }
  return <div><button className="button" onClick={logout} disabled={loading}>{loading ? "Patientez…" : "Se déconnecter"}</button>{error && <p role="alert">{error}</p>}</div>;
}
