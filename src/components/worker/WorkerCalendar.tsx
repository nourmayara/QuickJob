"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import type { CalendarData } from "@/lib/schedule-service";
import { availabilityInput, localParts } from "@/lib/schedule-time";
import { Panel } from "@/components/recruiter/ui";

type CalendarEvent = CalendarData["events"][number];
const labels: Record<string, string> = { AVAILABLE: "Disponible", UNAVAILABLE: "Indisponible", PENDING: "Candidature en attente", ACCEPTED: "Mission acceptée" };
export default function WorkerCalendar({ data }: { data: CalendarData }) {
  const router = useRouter();
  const details = useRef<HTMLDivElement>(null);
  const formPanel = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null), [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false), [pending, setPending] = useState(false), [error, setError] = useState(""), [saved, setSaved] = useState("");
  const selected = data.events.find(e => e.id === selectedId);
  const editing = data.events.find(e => e.id === editingId);
  const [year, month] = data.month.split("-").map(Number);
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate(), offset = (firstDay.getUTCDay() + 6) % 7;
  const monthLink = (delta: number) => `?month=${new Date(Date.UTC(year, month - 1 + delta, 1)).toISOString().slice(0, 7)}`;
  function select(event: CalendarEvent) { setSelectedId(event.id); setDeleting(false); requestAnimationFrame(() => details.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending) return;
    const form = event.currentTarget;
    const parsed = availabilityInput.safeParse(Object.fromEntries(new FormData(form)));
    setError(""); setSaved("");
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    setPending(true);
    try {
      const response = await fetch(`/api/travailleur/disponibilites${editing?.slotId ? `/${editing.slotId}` : ""}`, { method: editing?.slotId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      const result = await response.json();
      if (!response.ok) { setError(result.error || "Enregistrement impossible"); return; }
      setSaved("Créneau enregistré."); setEditingId(null); form.reset(); router.refresh();
    } catch { setError("Connexion au serveur impossible. Réessayez."); }
    finally { setPending(false); }
  }
  async function remove() {
    if (!selected?.slotId || pending) return;
    setPending(true); setError(""); setSaved("");
    try {
      const response = await fetch(`/api/travailleur/disponibilites/${selected.slotId}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) { setError(result.error || "Suppression impossible"); return; }
      setSelectedId(null); setEditingId(null); setDeleting(false); setSaved("Créneau supprimé."); router.refresh();
    } catch { setError("Connexion au serveur impossible. Réessayez."); }
    finally { setPending(false); }
  }
  return <>
    <p className="rq-notice">Tous les horaires sont affichés en heure de Tunisie ({data.timeZone}), quel que soit votre appareil. Une candidature acceptée réserve votre créneau ; une candidature en attente ne le réserve pas.</p>
    <div className="wk-calendar-toolbar"><div className="rq-detail-actions"><Link className="rq-button" href={monthLink(-1)} aria-label="Mois précédent">←</Link><Link className="rq-button" href={`?month=${localParts(new Date()).date.slice(0, 7)}`}>Aujourd’hui</Link><Link className="rq-button" href={monthLink(1)} aria-label="Mois suivant">→</Link><button className="rq-button" onClick={() => router.refresh()}>Actualiser</button></div><form method="GET" key={data.month} className="wk-month-form"><label className="rq-field">Mois<input name="month" type="month" min="2000-01" max="2099-12" required defaultValue={data.month} /></label><button className="rq-button rq-primary">Afficher</button></form></div>
    <div className="wk-calendar-legend">{Object.entries(labels).map(([type, label]) => <span key={type} className={`wk-calendar-event ${type.toLowerCase()}`}>{label}</span>)}</div>
    {error && <p className="rq-error" role="alert">{error}</p>}{saved && <p className="rq-success" role="status">{saved}</p>}
    {data.unscheduled > 0 && <p className="rq-notice">{data.unscheduled} candidature(s) ancienne(s) sans horaires complets ne peuvent pas être positionnées dans le calendrier. Consultez leur suivi dans Mes candidatures.</p>}
    <Panel title={firstDay.toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" })} description="Sélectionnez un événement pour consulter ses détails.">
      <div className="wk-calendar-grid">{["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(day => <div key={day} className="wk-calendar-weekday">{day}</div>)}{Array.from({ length: offset }, (_, i) => <div key={`blank-${i}`} className="wk-calendar-blank" />)}{Array.from({ length: days }, (_, i) => {
        const date = `${data.month}-${String(i + 1).padStart(2, "0")}`;
        const events = data.events.filter(e => e.date === date);
        return <section key={date} className="wk-calendar-day" aria-label={date}><h2><time dateTime={date}>{i + 1}</time><span className="wk-calendar-mobile-date"> {new Date(`${date}T12:00:00Z`).toLocaleDateString("fr-FR", { weekday: "long", month: "long", timeZone: "UTC" })}</span></h2>{events.map(e => <button type="button" key={e.id} data-event-id={e.id} className={`wk-calendar-event ${e.type.toLowerCase()}`} onClick={() => select(e)}><strong>{e.startTime}–{e.endTime}</strong><span>{labels[e.type]} : {e.title}</span></button>)}{events.length === 0 && <small className="wk-calendar-empty">Aucun événement</small>}</section>;
      })}</div>
    </Panel>
    <div ref={details}>{selected && <Panel title="Détails de l’événement"><div className="rq-detail"><p className={`wk-calendar-event ${selected.type.toLowerCase()}`}>{labels[selected.type]}</p><h2>{selected.title}</h2><p>{selected.date} · {selected.startTime}–{selected.endTime} (Tunisie)</p><p className="rq-description">{selected.note}</p><div className="rq-detail-actions">{selected.href && <Link className="rq-button rq-primary" href={selected.href}>Voir la candidature et la mission</Link>}{selected.slotId && <><button disabled={pending} className="rq-button" onClick={() => { setEditingId(selected.id); setError(""); formPanel.current?.scrollIntoView({ behavior: "smooth" }); }}>Modifier ce créneau</button><button disabled={pending} className="rq-button rq-danger" onClick={() => setDeleting(true)}>Supprimer ce créneau</button></>}</div>{deleting && <div className="rq-notice"><p>Supprimer définitivement ce créneau ?</p><button className="rq-button rq-danger" disabled={pending} onClick={remove}>Confirmer la suppression</button><button className="rq-button" disabled={pending} onClick={() => setDeleting(false)}>Conserver</button></div>}</div></Panel>}</div>
    <div ref={formPanel}><Panel title={editing ? "Modifier mon créneau" : "Déclarer un créneau"} description="Les créneaux déclarés ne doivent pas se chevaucher. Pour devenir indisponible pendant une mission confirmée, retirez d’abord la candidature concernée."><form key={editing ? `${editing.id}-${editing.startAt}-${editing.endAt}-${editing.type}` : "new"} className="rq-form" onSubmit={submit} aria-busy={pending}><fieldset className="wk-fieldset" disabled={pending}><legend className="sr-only">Disponibilité</legend><div className="rq-form-grid"><label className="rq-field">Type<select name="kind" defaultValue={editing?.type || "AVAILABLE"}><option value="AVAILABLE">Disponible</option><option value="UNAVAILABLE">Indisponible</option></select></label><label className="rq-field">Date<input name="date" type="date" min="2000-01-01" max="2099-12-31" required defaultValue={editing?.date || `${data.month}-01`} /></label><label className="rq-field">Début (Tunisie)<input name="startTime" type="time" required defaultValue={editing?.startTime || "09:00"} /></label><label className="rq-field">Fin (Tunisie)<input name="endTime" type="time" required defaultValue={editing?.endTime || "17:00"} /></label><label className="rq-field rq-span-2">Note personnelle (facultatif)<textarea name="note" maxLength={500} defaultValue={editing?.note || ""} /></label></div></fieldset><div className="rq-form-actions">{editing && <button type="button" className="rq-button" onClick={() => setEditingId(null)}>Annuler la modification</button>}<button className="rq-button rq-primary" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer le créneau"}</button></div></form></Panel></div>
  </>;
}
