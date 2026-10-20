"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { workerProfileSchema } from "@/lib/worker-validation";
import { Avatar } from "@/components/recruiter/ui";
type Profile = { firstName: string; name: string; city: string | null; skills: string | null; experience: string | null; languages: string | null; bio: string | null };
export default function WorkerProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [pending, setPending] = useState(false), [error, setError] = useState(""), [saved, setSaved] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending) return;
    setSaved(false); setError("");
    const parsed = workerProfileSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    setPending(true);
    try {
      const response = await fetch("/api/travailleur/profil", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "Enregistrement impossible"); return; }
      setSaved(true); router.refresh();
    } catch { setError("Connexion au serveur impossible. Veuillez réessayer."); }
    finally { setPending(false); }
  }
  return <form className="rq-form" onSubmit={submit} onChange={() => setSaved(false)} aria-busy={pending}><div className="rq-profile-summary"><Avatar name={`${profile.firstName} ${profile.name}`} /><div><h2>{profile.firstName} {profile.name}</h2><p className="rq-subtle">Vos informations professionnelles sont visibles par les recruteurs auxquels vous postulez.</p></div></div><fieldset disabled={pending} className="wk-fieldset"><legend className="sr-only">Profil professionnel</legend><div className="rq-form-grid">
    <label className="rq-field">Ville<input name="city" required maxLength={100} autoComplete="address-level2" defaultValue={profile.city || ""} placeholder="Ex. Tunis" /></label><label className="rq-field">Langues<input name="languages" required maxLength={1000} defaultValue={profile.languages || ""} placeholder="Ex. Arabe courant, français courant, anglais intermédiaire" /></label>
    <label className="rq-field rq-span-2">Compétences principales<input name="skills" required maxLength={1000} defaultValue={profile.skills || ""} placeholder="Ex. Accueil, service, préparation de commandes" /><small>Séparez vos compétences par des virgules.</small></label>
    <label className="rq-field rq-span-2">Expériences (facultatif)<textarea name="experience" maxLength={5000} defaultValue={profile.experience || ""} placeholder="Présentez vos expériences, vos tâches et leur durée. Vous pouvez laisser ce champ vide si vous débutez." /></label>
    <label className="rq-field rq-span-2">À propos de vous (facultatif)<textarea name="bio" maxLength={3000} defaultValue={profile.bio || ""} placeholder="Présentez-vous en quelques mots aux recruteurs…" /></label>
  </div></fieldset>{error && <p className="rq-error" role="alert">{error}</p>}{saved && <p className="rq-success" role="status">Votre profil professionnel a été enregistré.</p>}<div className="rq-form-actions"><button className="rq-button rq-primary" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer mon profil"}</button></div></form>;
}
