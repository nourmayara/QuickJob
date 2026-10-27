"use client";
import Link from "next/link";
import Image from "next/image";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { dashboardPath } from "@/lib/roles";
import { destinationAfterAuth, type Journey } from "@/lib/journey";
import { recruiterApprovalPath } from "@/lib/recruiter-approval";

function PasswordField({ confirm = false, register = false }: { confirm?: boolean; register?: boolean }) {
  const [visible, setVisible] = useState(false);
  const name = confirm ? "confirmPassword" : "password";
  const id = `${register ? "register" : "login"}-${name}`;
  return <label className="auth-field" htmlFor={id}>{confirm ? "Confirmer le mot de passe" : "Mot de passe"}<span className="auth-password"><input id={id} name={name} type={visible ? "text" : "password"} autoComplete={register ? "new-password" : "current-password"} required minLength={register ? 8 : 1} aria-describedby={register && !confirm ? "register-password-help" : undefined} /><button type="button" aria-label={`${visible ? "Masquer" : "Afficher"} ${confirm ? "la confirmation du" : "le"} mot de passe`} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? "Masquer" : "Afficher"}</button></span></label>;
}

export default function AuthForm({ mode, disabled = false, onRoleChange, onBusyChange, onStepChange, intent = null }: { mode: "login" | "register"; disabled?: boolean; onRoleChange?: (role: "TRAVAILLEUR" | "RECRUTEUR") => void; onBusyChange?: (busy: boolean) => void; onStepChange?: (step: number) => void; intent?: Journey | null }) {
  const router = useRouter();
  const register = mode === "register";
  const [role, setRole] = useState<"TRAVAILLEUR" | "RECRUTEUR">(intent === "recruteur" ? "RECRUTEUR" : "TRAVAILLEUR");
  const [step, setStep] = useState(1);
  const [recruiterType, setRecruiterType] = useState("INDIVIDUAL");
  const heading = useRef<HTMLHeadingElement>(null);
  function changeStep(next: number) {
    setStep(next); onStepChange?.(next); setError("");
    requestAnimationFrame(() => heading.current?.focus({ preventScroll: window.matchMedia("(min-width: 851px)").matches }));
  }
  function chooseRole(nextRole: "TRAVAILLEUR" | "RECRUTEUR") {
    setRole(nextRole);
    onRoleChange?.(nextRole);
    window.dispatchEvent(new CustomEvent("quickjob:role", { detail: nextRole }));
  }
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || disabled) return;
    if (register && step === 1) { changeStep(2); return; }
    const data = Object.fromEntries(new FormData(event.currentTarget));
    if (register && data.password !== data.confirmPassword) { setError("Les mots de passe ne correspondent pas."); return; }
    if (register && new TextEncoder().encode(String(data.password)).length > 72) { setError("Le mot de passe doit contenir au maximum 72 octets."); return; }
    setError(""); setLoading(true); onBusyChange?.(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(register ? { ...data, role, acceptTerms: data.acceptTerms === "on" } : data),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) { setError(result.error ?? "Une erreur est survenue"); return; }
      const selectedIntent = intent && register ? role === "RECRUTEUR" ? "recruteur" : "travailleur" : intent;
      router.push(result.role === "RECRUTEUR" ? recruiterApprovalPath(result.recruiterVerification?.status) : selectedIntent ? destinationAfterAuth(result.role, selectedIntent) : dashboardPath(result.role)); router.refresh();
    } catch { setError("Connexion au serveur impossible. Réessayez."); }
    finally { setLoading(false); onBusyChange?.(false); }
  }
  return <form onSubmit={submit} className="auth-form" aria-busy={loading} data-auth-form={mode} data-step={register ? step : undefined}><fieldset className="auth-controls" disabled={disabled || loading}><legend className="sr-only">{register ? "Créer un compte" : "Se connecter"}</legend>
    {register && <><ol className="auth-steps" aria-label="Étapes d’inscription"><li aria-current={step === 1 ? "step" : undefined}><span>1</span> Votre rôle</li><li aria-current={step === 2 ? "step" : undefined}><span>2</span> Vos informations</li></ol><h2 className="auth-step-title" ref={heading} tabIndex={-1}>{step === 1 ? "Comment souhaitez-vous nous rejoindre ?" : "Faisons connaissance"}</h2></>}
    {register && <fieldset className="auth-role-group" hidden={step !== 1}><legend className="sr-only">Votre rôle</legend>{([
      ["TRAVAILLEUR", "/images/worker-illustration.png", "Je suis Travailleur", "Je recherche des missions ponctuelles adaptées à mes disponibilités."],
      ["RECRUTEUR", "/images/recruiter-illustration.png", "Je suis Recruteur", "Je souhaite publier des missions et recruter des travailleurs."],
    ] as const).map(([value, image, title, description]) => <label className="auth-role" key={value}><input type="radio" name="roleChoice" value={value} checked={role === value} onChange={() => chooseRole(value)} /><span className="auth-role-visual" aria-hidden="true"><Image src={image} alt="" fill sizes="150px" /></span><span className="auth-role-copy"><span className="auth-role-icon" aria-hidden="true">{value === "TRAVAILLEUR" ? "♙" : "▣"}</span><strong>{title}</strong><span>{description}</span></span><span className="auth-role-check" aria-hidden="true">{role === value ? "✓" : ""}</span></label>)}</fieldset>}
    <fieldset className="auth-inputs" hidden={register && step === 1} disabled={loading || (register && step === 1)}><legend className="sr-only">{register ? "Informations personnelles" : "Identifiants"}</legend>
      {register && <div className="auth-row"><label className="auth-field">Nom<input name="name" autoComplete="family-name" required minLength={2} maxLength={80} /></label><label className="auth-field">Prénom<input name="firstName" autoComplete="given-name" required maxLength={80} /></label></div>}
      <label className="auth-field">Adresse email<input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="vous@exemple.com" /></label>
      {register && <><label className="auth-field">Téléphone<input name="phone" type="tel" autoComplete="tel" required pattern={"\\+?[0-9\\s\\(\\).\\-]{8,20}"} maxLength={20} placeholder="+216 …" /></label><label className="auth-field auth-city" hidden={role !== "TRAVAILLEUR"}><span>Ville <span className="auth-optional">(facultatif)</span></span><input name="city" autoComplete="address-level2" maxLength={100} disabled={role !== "TRAVAILLEUR"} /></label><fieldset className="auth-recruiter-inputs" hidden={role !== "RECRUTEUR"} disabled={role !== "RECRUTEUR"}><legend className="sr-only">Informations du recruteur</legend><label className="auth-field">Type de recruteur<select name="recruiterType" value={recruiterType} onChange={e => setRecruiterType(e.target.value)}><option value="INDIVIDUAL">Particulier</option><option value="COMPANY">Entreprise</option></select></label><label className="auth-field" hidden={recruiterType !== "COMPANY"}>Entreprise / organisation<input name="companyName" autoComplete="organization" required={recruiterType === "COMPANY" && role === "RECRUTEUR"} disabled={recruiterType !== "COMPANY" || role !== "RECRUTEUR"} maxLength={160} /></label></fieldset></>}
      {register ? <><div className="auth-password-fields"><PasswordField register /><PasswordField confirm register /><p id="register-password-help" className="auth-help">Au moins 8 caractères · 72 octets maximum.</p></div><label className="auth-consent"><input type="checkbox" name="acceptTerms" required /><span>J’accepte les <Link href="/conditions" target="_blank">conditions d’utilisation</Link> et j’ai lu les informations sur les <Link href="/confidentialite" target="_blank">données personnelles</Link>.</span></label></> : <><PasswordField /><Link href="/mot-de-passe-oublie" className="auth-forgot">Mot de passe oublié ?</Link></>}
    </fieldset>
    {error && <p role="alert" className="auth-error">{error}</p>}
    <button className="auth-submit" disabled={loading}>{loading ? "Patientez…" : register ? step === 1 ? "Continuer" : "Créer mon compte" : "Se connecter"}<span aria-hidden="true">{loading ? "◌" : "↗"}</span></button>
    {register && step === 2 && <button type="button" className="auth-back" disabled={loading} onClick={() => changeStep(1)}>← Modifier mon rôle</button>}
    <p className="auth-secure"><span aria-hidden="true">◇</span> Vos informations restent confidentielles.</p>
  </fieldset></form>;
}
