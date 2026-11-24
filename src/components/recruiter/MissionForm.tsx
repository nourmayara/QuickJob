"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { missionFormSchema } from "@/lib/recruiter-validation";
import { formatDinars } from "@/lib/financial-amounts";
import Icon from "./Icon";

export type MissionFormValues = { id: number; title: string; description: string; category: string | null; city: string | null; address: string | null; date: string; startTime: string | null; endTime: string | null; pay: number | null; capacity: number; skills: string | null; experience: string | null; status: string };
export default function MissionForm({ mission, categories }: { mission?: MissionFormValues; categories: string[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [pay, setPay] = useState(String(mission?.pay ?? ""));
  const [capacity, setCapacity] = useState(String(mission?.capacity ?? 1));
  const [estimate, setEstimate] = useState<{ commissionBps: number; commissionMillimes: number; missionTotalMillimes: number } | null>(null);
  const [estimateError, setEstimateError] = useState(false);
  useEffect(() => {
    if (mission && mission.status !== "DRAFT") return;
    if (pay === "" || Number(pay) < 0 || Number(pay) > 1_000_000 ||
        !Number.isInteger(Number(capacity)) || Number(capacity) < 1 || Number(capacity) > 1000) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch("/api/recruteur/finance/estimation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pay: Number(pay), capacity: Number(capacity) }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error();
        const result = await response.json();
        if (!controller.signal.aborted) setEstimate(result);
      } catch {
        if (!controller.signal.aborted) setEstimateError(true);
      }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [mission, pay, capacity]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending) return;
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const mode = submitter?.value === "DRAFT" ? "DRAFT" : "PUBLISHED";
    const parsed = missionFormSchema.safeParse({ ...values, pay: Number(values.pay), capacity: Number(values.capacity), status: mode });
    if (!parsed.success) { setError(parsed.error.issues.map(i => i.message).join(" · ")); return; }
    setError(""); setPending(true);
    const payload: Record<string, unknown> = { ...parsed.data };
    if (mission && mission.status !== "DRAFT") delete payload.status;
    try {
      const response = await fetch(mission ? `/api/missions/${mission.id}` : "/api/missions", { method: mission ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) { setError(result.error ?? "Enregistrement impossible"); return; }
      router.push(`/recruteur/missions/${mission?.id ?? result.id}`);
    } catch { setError("Connexion au serveur impossible. Réessayez."); }
    finally { setPending(false); }
  }
  return <form className="rq-form" onSubmit={submit} aria-busy={pending} onChange={event => {
    const input: EventTarget = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    if (input.name !== "pay" && input.name !== "capacity") return;
    setEstimate(null);
    setEstimateError(false);
    if (input.name === "pay") setPay(input.value);
    else setCapacity(input.value);
  }}>
    <div className="rq-notice"><Icon name="shield" size={17} /><span>Décrivez précisément votre besoin. Les dates et horaires sont ceux de la Tunisie ; la rémunération est exprimée par travailleur et par mission.</span></div>
    <fieldset disabled={pending} style={{ border: 0, padding: 0, margin: 0 }}><legend className="sr-only">Informations de la mission</legend><div className="rq-form-grid">
      <label className="rq-field rq-span-2">Titre de la mission<input name="title" required minLength={3} maxLength={160} defaultValue={mission?.title} placeholder="Ex. Serveurs pour un événement" /></label>
      <label className="rq-field rq-span-2">Description<textarea name="description" required minLength={10} maxLength={10000} defaultValue={mission?.description} placeholder="Présentez les tâches, le contexte et les conditions de la mission…" /></label>
      <label className="rq-field">Catégorie<select name="category" required defaultValue={mission?.category || ""}><option value="" disabled>Choisir une catégorie</option>{categories.map(c => <option key={c}>{c}</option>)}{mission?.category && mission.status !== "DRAFT" && !categories.includes(mission.category) && <option>{mission.category}</option>}</select></label>
      <label className="rq-field">Ville<input name="city" required maxLength={100} defaultValue={mission?.city || ""} placeholder="Ex. Tunis" /></label>
      <label className="rq-field rq-span-2">Adresse<input name="address" required minLength={3} maxLength={250} defaultValue={mission?.address || ""} placeholder="Adresse exacte du lieu de la mission" /></label>
      <label className="rq-field">Date<input name="date" type="date" required defaultValue={mission?.date} /></label>
      <label className="rq-field">Nombre de travailleurs<input name="capacity" type="number" required min={1} max={1000} step={1} defaultValue={mission?.capacity ?? 1} /></label>
      <label className="rq-field">Heure de début<input name="startTime" type="time" required defaultValue={mission?.startTime || ""} /></label>
      <label className="rq-field">Heure de fin<input name="endTime" type="time" required defaultValue={mission?.endTime || ""} /><small>La mission commence et se termine le même jour.</small></label>
      <label className="rq-field">Rémunération (TND)<input name="pay" type="number" required min={0} max={1000000} step="0.001" defaultValue={mission?.pay ?? ""} placeholder="0.000" /><small>Montant total par travailleur.</small></label>
      <label className="rq-field">Compétences souhaitées<input name="skills" maxLength={1000} defaultValue={mission?.skills || ""} placeholder="Ex. Service, accueil, travail en équipe" /></label>
      <label className="rq-field rq-span-2">Expérience souhaitée (facultatif)<textarea name="experience" maxLength={2000} defaultValue={mission?.experience || ""} placeholder="Précisez l’expérience utile pour cette mission…" /></label>
    </div></fieldset>
    {(!mission || mission.status === "DRAFT") && <div className="rq-notice" aria-live="polite">
      {estimate ? <span>Coût estimé pour {capacity} travailleur(s) · {formatDinars(estimate.missionTotalMillimes)}. Commission de {estimate.commissionBps / 100} %, soit {formatDinars(estimate.commissionMillimes)} par travailleur.</span> :
        <span>{estimateError ? "Estimation temporairement indisponible." : "Renseignez la rémunération et le nombre de travailleurs pour estimer le coût."}</span>}
    </div>}
    {error && <p className="rq-error" role="alert">{error}</p>}
    <div className="rq-form-actions"><Link href="/recruteur/missions" className="rq-button">Revenir aux missions</Link>{(!mission || mission.status === "DRAFT") && <button type="submit" value="DRAFT" className="rq-button" disabled={pending}>Enregistrer en brouillon</button>}<button type="submit" value="PUBLISHED" className="rq-button rq-primary" disabled={pending}><Icon name={mission && mission.status !== "DRAFT" ? "check" : "plus"} size={17} />{pending ? "Enregistrement…" : mission && mission.status !== "DRAFT" ? "Enregistrer les modifications" : "Publier la mission"}</button></div>
  </form>;
}
