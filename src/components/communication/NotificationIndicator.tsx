"use client";
import { useCallback, useEffect, useLayoutEffect, useId, useRef, useState } from "react";
import SoftIcon from "@/components/SoftIcon";
import Icon from "@/components/recruiter/Icon";
import type { IconName } from "@/components/recruiter/Icon";
import "./notification-popover.css";
type Item = { id: number; title: string; message: string; icon: IconName; href: string; createdAt: string; readAt: string | null };
export default function NotificationIndicator() {
  const id = useId();
  const root = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null), panel = useRef<HTMLElement>(null);
  const request = useRef<AbortController | null>(null), busy = useRef(false);
  const [open, setOpen] = useState(false), [items, setItems] = useState<Item[]>([]), [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState(""), [pending, setPending] = useState(false), [page, setPage] = useState(1), [more, setMore] = useState(false);
  const refresh = useCallback(async (nextPage = 1) => {
    request.current?.abort(); const controller = new AbortController(); request.current = controller; setLoading(true);
    try {
      const response = await fetch(`/api/notifications?page=${nextPage}`, { cache: "no-store", signal: controller.signal });
      if (!response.ok) throw Error();
      const rows: Item[] = await response.json(); if (controller.signal.aborted) return;
      setItems(previous => nextPage === 1 ? rows : [...previous, ...rows.filter(n => !previous.some(p => p.id === n.id))]);
      setCount(Number(response.headers.get("X-Unread-Count") || 0)); setPage(nextPage); setMore(rows.length === 20); setError("");
    } catch { if (!controller.signal.aborted) setError("Impossible de charger les notifications. Réessayez."); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }, []);
  useEffect(() => {
    const update = () => { if (!busy.current && document.visibilityState === "visible") void refresh(); };
    update(); const timer = window.setInterval(update, 60000);
    window.addEventListener("quickjob:notifications", update); window.addEventListener("focus", update);
    return () => { request.current?.abort(); clearInterval(timer); window.removeEventListener("quickjob:notifications", update); window.removeEventListener("focus", update); };
  }, [refresh]);
  useLayoutEffect(() => {
    if (!open) return;
    const position = () => {
      if (!panel.current) return;
      panel.current.style.right = "0px";
      const bounds = panel.current.getBoundingClientRect();
      panel.current.style.right = `${Math.max(0, bounds.right - window.innerWidth + 14) - Math.max(0, 14 - bounds.left)}px`;
    };
    position(); window.addEventListener("resize", position);
    return () => window.removeEventListener("resize", position);
  }, [open]);
  useEffect(() => {
    if (!open) return; panel.current?.querySelector<HTMLButtonElement>(".qj-bell-heading button")?.focus();
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);
  async function mark(item?: Item) {
    if (busy.current) return; busy.current = true; setPending(true); setError(""); request.current?.abort(); setLoading(false);
    try {
      if (!item?.readAt) {
        const response = await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(item ? { id: item.id } : { all: true }) });
        if (!response.ok) throw Error();
        setItems(previous => previous.map(n => !item || n.id === item.id ? { ...n, readAt: n.readAt || new Date().toISOString() } : n));
        setCount(previous => item ? Math.max(0, (previous || 0) - 1) : 0);
      }
      if (item) { setOpen(false); window.location.assign(item.href); }
    } catch { setError("Lecture non enregistrée. Veuillez réessayer."); }
    finally { busy.current = false; setPending(false); }
  }
  return <div className="qj-bell-root" ref={root} onBlur={event => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <button type="button" ref={trigger} className="qj-bell" aria-label={`Notifications : ${count === null ? "chargement" : `${count} non lues`}`} aria-expanded={open} aria-controls={id} aria-haspopup="dialog" onClick={() => { setOpen(!open); if (!open) void refresh(); }}>
      <SoftIcon name="bell" size={28} variant="glass" />
      {!!count && <span className="qj-bell-badge" aria-hidden="true">{count > 99 ? "99+" : count}</span>}
    </button>
    {open && <section id={id} ref={panel} tabIndex={-1} role="dialog" aria-label="Notifications" className="qj-bell-panel" aria-busy={loading || pending}>
      <div className="qj-bell-heading"><div><h2>Notifications</h2><span aria-live="polite">{count ?? "…"} non lue{count === 1 ? "" : "s"}</span></div><button type="button" aria-label="Fermer les notifications" onClick={() => { setOpen(false); trigger.current?.focus(); }}><Icon name="close" size={17} /></button></div>
      <button type="button" className="qj-bell-read-all" disabled={!count || pending || loading} onClick={() => void mark()}>Tout marquer comme lu</button>
      {error && <div className="qj-bell-feedback" role="alert">{error}<button type="button" disabled={loading || pending} onClick={() => void refresh()}>Réessayer</button></div>}
      {loading && <p className="qj-bell-feedback" role="status">Chargement…</p>}
      {!loading && !error && !items.length && <div className="qj-bell-empty"><SoftIcon name="check" size={28}/><strong>Vous êtes à jour</strong><p>Vos nouvelles notifications apparaîtront ici.</p></div>}
      <ul className="qj-bell-list">{items.map(n => <li key={n.id}><button type="button" className={`qj-bell-item ${n.readAt ? "is-read" : "is-unread"}`} disabled={pending} onClick={() => void mark(n)}><SoftIcon name={n.icon} size={22}/><span className="qj-bell-copy"><strong>{n.title}</strong><span>{n.message}</span><small><time dateTime={n.createdAt}>{new Date(n.createdAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</time> · {n.readAt ? "Lue" : "Non lue"}</small></span>{!n.readAt && <i aria-hidden="true"/>}</button></li>)}</ul>
      {more && <button type="button" className="qj-bell-read-all" disabled={loading || pending} onClick={() => void refresh(page + 1)}>Afficher plus</button>}
    </section>}
  </div>;
}
