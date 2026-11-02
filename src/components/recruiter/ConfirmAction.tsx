"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function ConfirmAction({ endpoint, data, label, title, description, danger = false, primary = false }: { endpoint: string; data: Record<string, unknown>; label: string; title: string; description: string; danger?: boolean; primary?: boolean }) {
  const router = useRouter();
  const dialog = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (open) dialog.current?.focus(); }, [open]);
  function close() { if (!pending) { setOpen(false); trigger.current?.focus(); } }
  async function confirm() {
    if (pending) return;
    setPending(true); setError("");
    try {
      const response = await fetch(endpoint, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const result = await response.json();
      if (!response.ok) { setError(result.error ?? "Action impossible"); return; }
      setOpen(false); trigger.current?.focus(); router.refresh();
    } catch { setError("Le serveur est indisponible. Réessayez."); }
    finally { setPending(false); }
  }
  return <><button ref={trigger} type="button" className={`rq-button ${danger ? "rq-danger" : primary ? "rq-primary" : ""}`} onClick={() => { setOpen(true); setError(""); }}>{label}</button>{open && <div className="rq-confirm-backdrop" onClick={close}><div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className="rq-confirm" onClick={e => e.stopPropagation()} onKeyDown={e => {
    if (e.key === "Escape") close();
    if (e.key === "Tab") {
      const buttons = Array.from(dialog.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []);
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    }
  }}><h3>{title}</h3><p>{description}</p>{error && <p className="rq-error" role="alert">{error}</p>}<div><button className="rq-button" disabled={pending} onClick={close}>Revenir</button><button className={`rq-button ${danger ? "rq-danger" : "rq-primary"}`} disabled={pending} onClick={confirm}>{pending ? "Enregistrement…" : "Confirmer"}</button></div></div></div>}</>;
}
