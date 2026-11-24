"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { CalendarData } from "@/lib/schedule-service";
import { availabilityInput, localParts } from "@/lib/schedule-time";
import { Panel } from "@/components/recruiter/ui";
import Icon from "@/components/recruiter/Icon";

type CalendarEvent = CalendarData["events"][number];
const labels: Record<string, string> = { AVAILABLE: "Disponible", UNAVAILABLE: "Indisponible", PENDING: "Candidature en attente", ACCEPTED: "Mission acceptée" };

export default function WorkerCalendar({ data }: { data: CalendarData }) {
  const router = useRouter();
  const details = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null), [editingId, setEditingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false), [deleting, setDeleting] = useState(false), [pending, setPending] = useState(false);
  const [error, setError] = useState(""), [saved, setSaved] = useState("");
  const selected = data.events.find(e => e.id === selectedId);
  const editing = data.events.find(e => e.id === editingId);
  const [year, month] = data.month.split("-").map(Number);
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const monthTitle = firstDay.toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate(), offset = (firstDay.getUTCDay() + 6) % 7;
  const monthLink = (delta: number) => `?month=${new Date(Date.UTC(year, month - 1 + delta, 1)).toISOString().slice(0, 7)}`;

  useEffect(() => {
    if (!modalOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape" && !pending) { setModalOpen(false); setEditingId(null); setError(""); } };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [modalOpen, pending]);

  function openCreate() { setEditingId(null); setError(""); setSaved(""); setModalOpen(true); }
  function openEdit(event: CalendarEvent) { setEditingId(event.id); setError(""); setSaved(""); setModalOpen(true); }
  function closeModal() { if (!pending) { setModalOpen(false); setEditingId(null); setError(""); } }
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
      setSaved("Créneau enregistré."); setEditingId(null); setModalOpen(false); form.reset(); router.refresh();
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

  return <div className="wk-calendar-page">
    {error && !modalOpen && <p className="rq-error" role="alert">{error}</p>}{saved && <p className="rq-success" role="status">{saved}</p>}
    {data.unscheduled > 0 && <p className="rq-notice">{data.unscheduled} candidature(s) sans horaires complets ne peuvent pas être positionnées. Consultez leur suivi dans Mes candidatures.</p>}
    <section className="wk-calendar-shell" aria-labelledby="calendar-month-title">
      <div className="wk-calendar-toolbar">
        <div className="wk-calendar-month-nav"><Link className="rq-button wk-calendar-arrow" href={monthLink(-1)} aria-label="Mois précédent">←</Link><h2 id="calendar-month-title">{monthTitle}</h2><Link className="rq-button wk-calendar-arrow" href={monthLink(1)} aria-label="Mois suivant">→</Link></div>
        <div className="wk-calendar-controls"><Link className="rq-button" href={`?month=${localParts(new Date()).date.slice(0, 7)}`}><Icon name="calendar" size={16} />Aujourd’hui</Link><button type="button" className="rq-button" onClick={() => router.refresh()}>↻ Actualiser</button><form method="GET" key={data.month} className="wk-month-form"><label className="sr-only" htmlFor="calendar-month">Choisir un mois</label><input id="calendar-month" name="month" type="month" min="2000-01" max="2099-12" required defaultValue={data.month} onChange={event => event.currentTarget.form?.requestSubmit()} /></form><button type="button" className="rq-button rq-primary wk-calendar-create" onClick={openCreate}><Icon name="plus" size={17} />Déclarer un créneau</button></div>
      </div>
      <div className="wk-calendar-legend">{Object.entries(labels).map(([type, label]) => <span key={type} className={`wk-calendar-event ${type.toLowerCase()}`}>{label}</span>)}</div>
      <div className="wk-calendar-grid">{["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(day => <div key={day} className="wk-calendar-weekday">{day}</div>)}{Array.from({ length: offset }, (_, i) => <div key={`blank-${i}`} className="wk-calendar-blank" />)}{Array.from({ length: days }, (_, i) => {
        const date = `${data.month}-${String(i + 1).padStart(2, "0")}`;
        const events = data.events.filter(e => e.date === date);
        return <section key={date} className="wk-calendar-day" aria-label={date}><h2><time dateTime={date}>{i + 1}</time><span className="wk-calendar-mobile-date"> {new Date(`${date}T12:00:00Z`).toLocaleDateString("fr-FR", { weekday: "long", month: "long", timeZone: "UTC" })}</span></h2>{events.map(e => <button type="button" key={e.id} data-event-id={e.id} className={`wk-calendar-event ${e.type.toLowerCase()}`} onClick={() => select(e)}><strong>{e.startTime}–{e.endTime}</strong><span>{labels[e.type]} : {e.title}</span></button>)}{events.length === 0 && <small className="wk-calendar-empty">Aucun événement</small>}</section>;
      })}</div>
    </section>
    <div ref={details}>{selected && <Panel title="Détails de l’événement"><div className="rq-detail"><p className={`wk-calendar-event ${selected.type.toLowerCase()}`}>{labels[selected.type]}</p><h2>{selected.title}</h2><p>{selected.date} · {selected.startTime}–{selected.endTime} (Tunisie)</p><p className="rq-description">{selected.note}</p><div className="rq-detail-actions">{selected.href && <Link className="rq-button rq-primary" href={selected.href}>Voir la candidature et la mission</Link>}{selected.slotId && <><button disabled={pending} className="rq-button" onClick={() => openEdit(selected)}>Modifier ce créneau</button><button disabled={pending} className="rq-button rq-danger" onClick={() => setDeleting(true)}>Supprimer ce créneau</button></>}</div>{deleting && <div className="rq-notice"><p>Supprimer définitivement ce créneau ?</p><button className="rq-button rq-danger" disabled={pending} onClick={remove}>Confirmer la suppression</button><button className="rq-button" disabled={pending} onClick={() => setDeleting(false)}>Conserver</button></div>}</div></Panel>}</div>
    {modalOpen && <div className="wk-calendar-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) closeModal(); }}><section className="wk-calendar-modal" role="dialog" aria-modal="true" aria-labelledby="availability-dialog-title"><header><div><span className="wk-calendar-modal-icon"><Icon name="calendar" size={24} /></span><div><h2 id="availability-dialog-title">{editing ? "Modifier mon créneau" : "Déclarer un créneau"}</h2><p>Ajoutez vos disponibilités pour vos prochaines missions.</p></div></div><button type="button" className="wk-calendar-modal-close" aria-label="Fermer" onClick={closeModal}><Icon name="close" size={18} /></button></header><form key={editing ? `${editing.id}-${editing.startAt}-${editing.endAt}-${editing.type}` : "new"} className="rq-form wk-calendar-modal-form" onSubmit={submit} aria-busy={pending}><fieldset className="wk-fieldset" disabled={pending}><legend className="sr-only">Disponibilité</legend><div className="rq-form-grid"><label className="rq-field">Type<select name="kind" defaultValue={editing?.type || "AVAILABLE"} autoFocus><option value="AVAILABLE">Disponible</option><option value="UNAVAILABLE">Indisponible</option></select></label><label className="rq-field">Date<input name="date" type="date" min="2000-01-01" max="2099-12-31" required defaultValue={editing?.date || `${data.month}-01`} /></label><label className="rq-field">Début (Tunisie)<input name="startTime" type="time" required defaultValue={editing?.startTime || "09:00"} /></label><label className="rq-field">Fin (Tunisie)<input name="endTime" type="time" required defaultValue={editing?.endTime || "17:00"} /></label><label className="rq-field rq-span-2">Note personnelle (facultatif)<textarea name="note" maxLength={500} rows={4} placeholder="Ex. : Disponible toute la journée" defaultValue={editing?.note || ""} /></label></div></fieldset>{error && <p className="rq-error" role="alert">{error}</p>}<div className="rq-form-actions"><button type="button" className="rq-button" onClick={closeModal} disabled={pending}>Annuler</button><button className="rq-button rq-primary" disabled={pending}><Icon name="calendar" size={17} />{pending ? "Enregistrement…" : "Enregistrer le créneau"}</button></div></form></section></div>}
  </div>;
}
