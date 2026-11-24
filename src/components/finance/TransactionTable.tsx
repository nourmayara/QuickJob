"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDinars } from "@/lib/financial-amounts";
import styles from "@/app/admin/finance/finance.module.css";

export type TransactionRow = {
  id: string; status: string; mission: string; missionId: number; engagementId: number; recruiter: string; worker: string;
  stripeIntentId: string | null; totalMillimes: number; commissionBps: number; commissionMillimes: number;
  workerMillimes: number; stripeAmount: number; stripeCurrency: string; createdAt: string; paidAt: string | null;
  dueAt: string | null; overdue: boolean; disputed: boolean;
  payout: { createdAt: string; reversedAt: string | null } | null;
  refund: { status: string; reason: string; createdAt: string; completedAt: string | null; stripeRefundId: string | null } | null;
};

const labels: Record<string, string> = { PENDING: "En attente", FAILED: "Échec", SUCCEEDED: "Réussi", REFUNDED: "Remboursé" };
const refundLabels: Record<string, string> = { REQUESTED: "Demandé", SUCCEEDED: "Effectué", FAILED: "Échec" };

const canReconcile = (row: TransactionRow) => !!row.stripeIntentId && ["PENDING", "FAILED"].includes(row.status);
const needsAttention = (row: TransactionRow) => row.overdue || row.disputed || canReconcile(row) ||
  row.status === "FAILED" || row.refund?.status === "REQUESTED" || row.refund?.status === "FAILED";

const stripeAmount = (row: TransactionRow) => new Intl.NumberFormat("fr-FR", {
  style: "currency", currency: row.stripeCurrency,
}).format(row.stripeAmount / 100);
const normalize = (text: string) => text.trim().toLocaleLowerCase("fr").normalize("NFD").replace(/\p{Diacritic}/gu, "");

function PaymentStatus({ status }: { status: string }) {
  return <span className={styles.status} data-status={status}>{labels[status] ?? status}</span>;
}

function ReconciliationAction({ row, onSuccess }: { row: TransactionRow; onSuccess: (message: string) => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ message: string; ok: boolean }>();

  async function reconcile() {
    setLoading(true);
    setResult(undefined);
    try {
      const response = await fetch("/api/admin/finance/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: row.id }),
      });
      const data = await response.json();
      const message = response.ok ? data.message : data.error;
      setResult({ message, ok: response.ok });
      if (response.ok) {
        onSuccess(message);
        router.refresh();
      }
    } catch {
      setResult({ message: "La vérification n’a pas abouti. Réessayez.", ok: false });
    } finally {
      setLoading(false);
    }
  }

  return <>
    {canReconcile(row) && !result?.ok && <button type="button" className="rq-button" disabled={loading} onClick={reconcile}>
      {loading ? "Vérification…" : "Vérifier avec Stripe"}
    </button>}
    {result && <p className={result.ok ? styles.feedback : "rq-error"} role={result.ok ? "status" : "alert"}>{result.message}</p>}
  </>;
}

function TransactionDetails({ row, onClose, onSuccess }: {
  row: TransactionRow; onClose: (destination?: HTMLElement) => void; onSuccess: (message: string) => void;
}) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const closeDestination = useRef<HTMLElement>(undefined);
  const { payout, refund } = row;

  useEffect(() => {
    if (!dialog.current?.open) dialog.current?.showModal();
    title.current?.focus({ preventScroll: true });
  }, []);

  return <dialog ref={dialog} className={styles.dialog} aria-labelledby={id} onClose={() => onClose(closeDestination.current)}>
    <div className={styles.dialogLayout}>
      <header className={styles.dialogHeader}>
        <div>
          <h2 id={id} ref={title} tabIndex={-1}>Détails de la transaction</h2>
          <p>{row.mission} · Mission #{row.missionId}</p>
          <PaymentStatus status={row.status} />
        </div>
        <button type="button" className="rq-button" aria-label="Fermer les détails" onClick={() => dialog.current?.close()}>
          <span aria-hidden="true">×</span>
        </button>
      </header>
      <div className={styles.dialogContent} tabIndex={0} role="region" aria-label="Informations de la transaction">
        <section>
          <h3>Contrat et participants</h3>
          <dl className={styles.facts}>
            <div><dt>Recruteur</dt><dd>{row.recruiter}</dd></div>
            <div><dt>Travailleur</dt><dd>{row.worker}</dd></div>
            <div><dt>Engagement</dt><dd>#{row.engagementId}</dd></div>
            <div><dt>Total contractuel</dt><dd>{formatDinars(row.totalMillimes)}</dd></div>
            <div><dt>Commission QuickJob</dt><dd>{formatDinars(row.commissionMillimes)} · {row.commissionBps / 100} %</dd></div>
            <div><dt>Rémunération contractuelle</dt><dd>{formatDinars(row.workerMillimes)}</dd></div>
          </dl>
        </section>
        <section>
          <h3>Paiement Stripe · mode test</h3>
          <dl className={styles.facts}>
            <div><dt>Montant Stripe</dt><dd>{stripeAmount(row)}</dd></div>
            <div><dt>Créé le (Tunis)</dt><dd>{row.createdAt}</dd></div>
            <div><dt>Payé le (Tunis)</dt><dd>{row.paidAt ?? "—"}</dd></div>
            <div><dt>Échéance (Tunis)</dt><dd>{row.dueAt ?? "—"}{row.overdue && " · En retard"}</dd></div>
            <div><dt>Référence Stripe</dt><dd>{row.stripeIntentId ?? "En cours de création"}</dd></div>
            <div><dt>Référence QuickJob</dt><dd>{row.id}</dd></div>
          </dl>
          {canReconcile(row) && <p>Vérifiez auprès de Stripe si le paiement existant a déjà abouti.</p>}
          <ReconciliationAction key={row.id} row={row} onSuccess={onSuccess} />
        </section>
        <section>
          <h3>Versement simulé</h3>
          {payout ? <p>{formatDinars(row.workerMillimes)} · Enregistré le {payout.createdAt} (Tunis)
            {payout.reversedAt && ` · Annulé le ${payout.reversedAt} (Tunis)`}</p> : <p>Aucun versement simulé enregistré.</p>}
        </section>
        <section>
          <h3>Remboursement et litige</h3>
          {refund ? <dl className={styles.facts}>
            <div><dt>Statut</dt><dd>{refundLabels[refund.status] ?? refund.status}</dd></div>
            <div><dt>Motif</dt><dd className="whitespace-pre-wrap">{refund.reason}</dd></div>
            <div><dt>Demandé le (Tunis)</dt><dd>{refund.createdAt}</dd></div>
            <div><dt>Terminé le (Tunis)</dt><dd>{refund.completedAt ?? "—"}</dd></div>
            {refund.stripeRefundId && <div><dt>Référence du remboursement</dt><dd>{refund.stripeRefundId}</dd></div>}
          </dl> : <p>Aucun remboursement enregistré.</p>}
          {(row.disputed || (row.status === "SUCCEEDED" && (!refund || refund.status === "REQUESTED"))) &&
            <p><a className="rq-button" href="#contrats" onClick={() => {
              const contracts = document.getElementById("contrats");
              if (contracts instanceof HTMLDetailsElement) {
                contracts.open = true;
                closeDestination.current = contracts.querySelector("summary") ?? undefined;
              }
              dialog.current?.close();
            }}>Voir les actions sur les contrats</a></p>}
          {["SUCCEEDED", "REFUNDED"].includes(row.status) && <a className="rq-button" href={`/api/finance/receipts/${row.id}`}>Télécharger le justificatif de test</a>}
        </section>
      </div>
    </div>
  </dialog>;
}

export default function TransactionTable({ rows }: { rows: TransactionRow[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [attention, setAttention] = useState(false);
  const [selectedId, setSelectedId] = useState<string>();
  const [reconciliationMessage, setReconciliationMessage] = useState("");
  const trigger = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const normalized = normalize(query);
  const selected = rows.find(row => row.id === selectedId);
  const attentionCount = rows.filter(needsAttention).length;
  const statusCounts = new Map<string, number>();
  for (const row of rows) statusCounts.set(row.status, (statusCounts.get(row.status) ?? 0) + 1);
  const filtered = rows.filter(row =>
    (!status || row.status === status) && (!attention || needsAttention(row)) &&
    [row.id, row.stripeIntentId, row.mission, row.recruiter, row.worker, `#${row.missionId}`]
      .some(value => value && normalize(value).includes(normalized)),
  );

  return <>
    <div className={styles.toolbar}>
      <label className="rq-field">Rechercher
        <input ref={search} type="search" placeholder="Mission, personne ou référence" value={query} onChange={event => setQuery(event.target.value)} />
      </label>
      <label className="rq-field">Statut<select value={status} onChange={event => setStatus(event.target.value)}>
        <option value="">Tous les statuts · {rows.length}</option>
        {Object.entries(labels).map(([value, label]) =>
          <option key={value} value={value}>{label} · {statusCounts.get(value) ?? 0}</option>,
        )}
      </select></label>
      <button type="button" className={`rq-button ${attention ? "rq-primary" : ""}`} aria-pressed={attention}
        onClick={() => setAttention(value => !value)}>À examiner · {attentionCount}</button>
    </div>
    {reconciliationMessage && <p className={styles.feedback} role="status">{reconciliationMessage}</p>}
    <p className={styles.resultCount} role="status">{filtered.length} transaction(s) affichée(s)</p>
    {!filtered.length ? <div className={styles.empty}>
      <p>{rows.length ? "Aucune transaction ne correspond aux filtres." : "Aucun paiement Stripe enregistré."}</p>
      {!!rows.length && <button type="button" className="rq-button" onClick={() => {
        setQuery(""); setStatus(""); setAttention(false); search.current?.focus();
      }}>Réinitialiser les filtres</button>}
    </div> : <div className="rq-table-scroll">
      <table className={`rq-table ${styles.table}`} role="table" aria-label="Transactions Stripe en mode test">
        <thead role="rowgroup"><tr role="row"><th role="columnheader" scope="col">Mission</th><th role="columnheader" scope="col">Statut</th><th role="columnheader" scope="col">Contrat · DT</th><th role="columnheader" scope="col">Stripe · test</th><th role="columnheader" scope="col">Actions</th></tr></thead>
        <tbody role="rowgroup">{filtered.map(row => <tr key={row.id} role="row" data-attention={needsAttention(row)}>
          <td role="cell"><strong>{row.mission}</strong><small>{row.recruiter} · {row.createdAt}</small></td>
          <td role="cell"><div className={styles.rowStatus}>
            <PaymentStatus status={row.status} />
            {needsAttention(row) && <small>{row.overdue ? "En retard" : row.disputed ? "Litige ouvert" :
              row.refund?.status === "REQUESTED" ? "Remboursement demandé" : row.refund?.status === "FAILED" ? "Échec du remboursement" :
              canReconcile(row) ? "Vérification possible" : "À examiner"}</small>}
          </div></td>
          <td role="cell"><span className={styles.mobileLabel} aria-hidden="true">Contrat · DT</span>{formatDinars(row.totalMillimes)}</td>
          <td role="cell"><span className={styles.mobileLabel} aria-hidden="true">Stripe · test</span>{stripeAmount(row)}</td>
          <td role="cell"><button type="button" className="rq-button" aria-haspopup="dialog"
            aria-label={`Voir les détails de la mission ${row.mission}, transaction du ${row.createdAt}`}
            onClick={event => { trigger.current = event.currentTarget; setSelectedId(row.id); }}>Voir les détails</button></td>
        </tr>)}</tbody>
      </table>
    </div>}
    {selected && <TransactionDetails row={selected} onSuccess={setReconciliationMessage} onClose={destination => {
      setSelectedId(undefined);
      (destination ?? (trigger.current?.isConnected ? trigger.current : search.current))?.focus({ preventScroll: true });
    }} />}
  </>;
}

