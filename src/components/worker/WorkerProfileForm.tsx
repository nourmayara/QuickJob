"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { workerProfileSchema } from "@/lib/worker-validation";
import { Avatar } from "@/components/recruiter/ui";
import ProfileImageInput from "@/components/recruiter/ProfileImageInput";
import Image from "next/image";

type SuggestedSkill = { name: string; evidence?: string; source: "manual" | "llm" | "rule-based" | "structured"; selected: boolean };
type Profile = { avatarUrl: string | null; firstName: string; name: string; city: string | null; skills: string | null; experience: string | null; languages: string | null; bio: string | null; workerSkills: { source: string; skill: { name: string } }[] };
const skillKey = (value: string) => value.normalize("NFKD").replace(/\p{M}/gu, "").trim().replace(/\s+/g, " ").toLocaleLowerCase("fr");

export default function WorkerProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [pending, setPending] = useState(false), [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(""), [analysisNotice, setAnalysisNotice] = useState(""), [saved, setSaved] = useState(false);
  const [experience, setExperience] = useState(profile.experience || ""), [skillsText, setSkillsText] = useState(profile.skills || "");
  const [suggestions, setSuggestions] = useState<SuggestedSkill[]>(() => profile.workerSkills.map(item => ({ name: item.skill.name, source: "structured", selected: true })));
  const selectedCount = useMemo(() => suggestions.filter(item => item.selected && item.name.trim()).length, [suggestions]);

  async function analyzeExperience() {
    if (analyzing) return;
    setError(""); setAnalysisNotice(""); setAnalyzing(true);
    try {
      const response = await fetch("/api/travailleur/competences/analyser", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ experience }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "Analyse impossible"); return; }
      const incoming: SuggestedSkill[] = data.skills.map((item: { name: string; evidence?: string; source: "llm" | "rule-based" }) => ({ ...item, selected: true }));
      setSuggestions(current => {
        const merged = new Map(current.map(item => [skillKey(item.name), item]));
        for (const item of incoming) if (!merged.has(skillKey(item.name))) merged.set(skillKey(item.name), item);
        return [...merged.values()];
      });
      setAnalysisNotice(data.notice || `${incoming.length} compétence(s) proposée(s). Vérifiez-les avant l’enregistrement.`);
    } catch { setError("Connexion au service d’analyse impossible. Veuillez réessayer."); }
    finally { setAnalyzing(false); }
  }

  function updateSuggestion(index: number, patch: Partial<SuggestedSkill>) {
    setSaved(false); setSuggestions(items => items.map((item, current) => current === index ? { ...item, ...patch } : item));
  }
  function removeSuggestion(index: number) {
    setSaved(false); setSuggestions(items => items.filter((_, current) => current !== index));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending) return;
    setSaved(false); setError("");
    const parsed = workerProfileSchema.safeParse({ ...Object.fromEntries(new FormData(event.currentTarget)), skills: skillsText, experience });
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    const selected = suggestions.filter(item => item.selected && item.name.trim()).map(item => ({ name: item.name.trim(), evidence: item.evidence, source: item.source }));
    const manual = skillsText.split(/[,;\n]/).map(name => name.trim()).filter(name => name.length >= 2 && name.length <= 60).map(name => ({ name, source: "manual" as const }));
    const selectedSkills = [...new Map([...manual, ...selected].map(item => [skillKey(item.name), item])).values()].slice(0, 30);
    setPending(true);
    try {
      const response = await fetch("/api/travailleur/profil", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...parsed.data, selectedSkills }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "Enregistrement impossible"); return; }
      setSaved(true); router.refresh();
    } catch { setError("Connexion au serveur impossible. Veuillez réessayer."); }
    finally { setPending(false); }
  }

  return <form className="rq-form" onSubmit={submit} onChange={() => setSaved(false)} aria-busy={pending}>
    <div className="rq-profile-summary">{profile.avatarUrl ? <Image unoptimized src={profile.avatarUrl} alt="Photo de profil" width={56} height={56} style={{ objectFit: "cover", borderRadius: 12 }} /> : <Avatar name={`${profile.firstName} ${profile.name}`} />}<div><h2>{profile.firstName} {profile.name}</h2><p className="rq-subtle">Vos informations professionnelles sont visibles par les recruteurs auxquels vous postulez.</p></div></div>
    <fieldset disabled={pending} className="wk-fieldset"><legend className="sr-only">Profil professionnel</legend><div className="rq-form-grid">
      <label className="rq-field">Prénom<input name="firstName" required maxLength={80} autoComplete="given-name" defaultValue={profile.firstName} /></label><label className="rq-field">Nom<input name="name" required minLength={2} maxLength={80} autoComplete="family-name" defaultValue={profile.name} /></label><ProfileImageInput initialValue={profile.avatarUrl} label="Photo (facultatif)" /><label className="rq-field">Ville<input name="city" required maxLength={100} autoComplete="address-level2" defaultValue={profile.city || ""} placeholder="Ex. Tunis" /></label><label className="rq-field">Langues<input name="languages" required maxLength={1000} defaultValue={profile.languages || ""} placeholder="Ex. Arabe courant, français courant, anglais intermédiaire" /></label>
      <label className="rq-field rq-span-2">Compétences principales<input name="skills" required maxLength={1000} value={skillsText} onChange={event => setSkillsText(event.target.value)} placeholder="Ex. Accueil, service, préparation de commandes" /><small>Séparez vos compétences par des virgules.</small></label>
      <div className="rq-field rq-span-2 wk-ai-experience"><label htmlFor="worker-experience">Expériences professionnelles (facultatif)</label><textarea id="worker-experience" name="experience" maxLength={5000} value={experience} onChange={event => setExperience(event.target.value)} placeholder="Décrivez vos postes, missions, tâches réalisées et leur durée. Soyez précis : l’analyse ne proposera que des compétences justifiées par ce texte." />
        <div className="wk-ai-toolbar"><p><strong>Assistant compétences</strong><span>L’analyse produit uniquement des suggestions. Vous gardez le dernier mot.</span></p><button type="button" className="rq-button wk-ai-button" onClick={analyzeExperience} disabled={analyzing || pending}>{analyzing ? "Analyse en cours…" : "✦ Analyser avec l’IA"}</button></div>
        {analysisNotice && <p className="wk-analysis-notice" role="status">{analysisNotice}</p>}
        {suggestions.length > 0 && <div className="wk-skill-review" aria-label="Compétences proposées"><div className="wk-skill-review-heading"><strong>Compétences proposées</strong><span>{selectedCount} sélectionnée(s)</span></div><div className="wk-skill-badges">{suggestions.map((item, index) => <div className={`wk-skill-badge ${item.selected ? "is-selected" : ""}`} key={`${skillKey(item.name)}-${index}`}><label className="wk-skill-choice"><input type="checkbox" checked={item.selected} onChange={event => updateSuggestion(index, { selected: event.target.checked })} /><span className="sr-only">Sélectionner</span></label><input aria-label={`Modifier la compétence ${item.name}`} value={item.name} maxLength={60} onChange={event => updateSuggestion(index, { name: event.target.value })} /><button type="button" onClick={() => removeSuggestion(index)} aria-label={`Refuser la suggestion ${item.name}`}>×</button>{item.evidence && <small title={item.evidence}>Justifiée par : « {item.evidence} »</small>}</div>)}</div></div>}
      </div>
      <label className="rq-field rq-span-2">À propos de vous (facultatif)<textarea name="bio" maxLength={3000} defaultValue={profile.bio || ""} placeholder="Présentez-vous en quelques mots aux recruteurs…" /></label>
    </div></fieldset>{error && <p className="rq-error" role="alert">{error}</p>}{saved && <p className="rq-success" role="status">Votre profil professionnel et vos compétences ont été enregistrés.</p>}<div className="rq-form-actions"><button className="rq-button rq-primary" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer mon profil"}</button></div>
  </form>;
}
