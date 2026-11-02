"use client";
import Image from "next/image";
import Icon from "@/components/recruiter/Icon";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { recruiterProfileSchema } from "@/lib/recruiter-validation";
import { Avatar } from "./ui";
import ProfileImageInput from "./ProfileImageInput";
type Profile = { address: string | null; name: string; firstName: string; email: string; phone: string; city: string | null; companyName: string | null; sector: string | null; bio: string | null; avatarUrl: string | null };
export default function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending) return;
    setSaved(false); setError("");
    const parsed = recruiterProfileSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    setPending(true);
    try {
      const response = await fetch("/api/recruteur/profil", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      const result = await response.json();
      if (!response.ok) { setError(result.error ?? "Enregistrement impossible"); return; }
      setSaved(true); router.refresh();
    } catch { setError("Connexion au serveur impossible. Réessayez."); }
    finally { setPending(false); }
  }
  return <form className="rq-form" onSubmit={submit} onChange={() => setSaved(false)} aria-busy={pending}><div className="rq-profile-summary">{profile.avatarUrl ? <Image unoptimized src={profile.avatarUrl} alt="Photo du profil recruteur" width={56} height={56} style={{ borderRadius: 12, objectFit: "cover" }} /> : <Avatar name={`${profile.firstName} ${profile.name}`} />}<div><h2>{profile.companyName || `${profile.firstName} ${profile.name}`}</h2><p className="rq-subtle">Profil professionnel recruteur</p></div></div>
    <fieldset disabled={pending} style={{ border: 0, padding: 0, margin: 0 }}><legend className="sr-only">Informations professionnelles</legend><div className="rq-form-grid">
      <label className="rq-field">Prénom<input name="firstName" defaultValue={profile.firstName} required maxLength={80} autoComplete="given-name" /></label><label className="rq-field">Nom<input name="name" defaultValue={profile.name} required minLength={2} maxLength={80} autoComplete="family-name" /></label>
      <label className="rq-field">Nom de l’entreprise (facultatif)<input name="companyName" defaultValue={profile.companyName || ""} maxLength={160} autoComplete="organization" /></label><label className="rq-field">Secteur d’activité<input required name="sector" defaultValue={profile.sector || ""} maxLength={100} placeholder="Ex. Restauration, événementiel…" /></label>
      <label className="rq-field rq-span-2">Adresse<input name="address" required minLength={3} maxLength={250} autoComplete="street-address" defaultValue={profile.address || ""} /></label><label className="rq-field">Ville<input name="city" defaultValue={profile.city || ""} maxLength={100} autoComplete="address-level2" /></label><label className="rq-field">Téléphone<input name="phone" type="tel" defaultValue={profile.phone} required maxLength={20} autoComplete="tel" /></label>
      <label className="rq-field rq-span-2">Email<input type="email" value={profile.email} readOnly /><small>La modification de l’email nécessite une vérification et n’est pas encore disponible.</small></label>
      <label className="rq-field rq-span-2">Présentation de votre activité<textarea required name="bio" defaultValue={profile.bio || ""} maxLength={3000} placeholder="Présentez votre entreprise et les missions que vous proposez…" /></label>
      <ProfileImageInput initialValue={profile.avatarUrl} label="Logo ou photo (facultatif)" />
    </div></fieldset>{error && <p role="alert" className="rq-error">{error}</p>}{saved && <p role="status" className="rq-success">Votre profil a été enregistré.</p>}<div className="rq-form-actions"><button disabled={pending} className="rq-button rq-primary"><Icon name="check" size={18} />{pending ? "Enregistrement…" : "Enregistrer mon profil"}</button></div>
  </form>;
}
