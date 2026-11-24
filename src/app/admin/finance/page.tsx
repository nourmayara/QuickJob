import { requirePageRole } from "@/lib/authorization";
import { getFinancialSettings } from "@/lib/financial-settings";
import prisma from "@/lib/prisma";
import { PageHeading, Panel } from "@/components/recruiter/ui";
import FinancialSettingsForm from "@/components/admin/FinancialSettingsForm";
import ContractList from "@/components/finance/ContractList";
import FinancialOverview from "@/components/finance/FinancialOverview";
import TransactionTable, { type TransactionRow } from "@/components/finance/TransactionTable";
import { formatDinars } from "@/lib/financial-amounts";
import styles from "./finance.module.css";

const fullName = ({ firstName, name }: { firstName: string | null; name: string }) =>
  [firstName, name].filter(Boolean).join(" ");

export default async function FinancePage() {
  const admin = await requirePageRole(["ADMIN"]);
  const [settings, history, transactions, overdue] = await Promise.all([
    getFinancialSettings(),
    prisma.commissionRateHistory.findMany({
      orderBy: { id: "desc" },
      include: { admin: { select: { firstName: true, name: true } } },
    }),
    prisma.engagementPayment.findMany({
      orderBy: { createdAt: "desc" },
      include: { payout: true, refund: true, engagement: { include: { application: { include: {
        worker: { select: { name: true, firstName: true } },
        mission: { select: { id: true, title: true, recruiter: { select: { name: true, firstName: true } } } },
      } } } } },
    }),
    prisma.engagement.findMany({
      where: { status: "AWAITING_PAYMENT", checkedOutAt: { not: null }, paymentDueAt: { lt: new Date() } },
      orderBy: { paymentDueAt: "asc" },
      include: { application: { include: { mission: {
        select: { title: true, recruiter: { select: { name: true, firstName: true } } },
      } } } },
    }),
  ]);
  const dates = new Intl.DateTimeFormat("fr-TN", { dateStyle: "short", timeStyle: "short", timeZone: "Africa/Tunis" });
  const date = (value: Date | null | undefined) => value ? dates.format(value) : null;
  const overdueIds = new Set(overdue.map(item => item.id));
  const rows: TransactionRow[] = transactions.map(payment => {
    const { engagement, payout, refund } = payment;
    const { mission, worker } = engagement.application;
    return {
      id: payment.id, status: payment.status, mission: mission.title, missionId: mission.id,
      engagementId: engagement.id, recruiter: fullName(mission.recruiter), worker: fullName(worker),
      stripeIntentId: payment.stripeIntentId, totalMillimes: engagement.totalMillimes,
      commissionBps: engagement.commissionBps, commissionMillimes: engagement.commissionMillimes,
      workerMillimes: engagement.workerMillimes, stripeAmount: payment.stripeAmount,
      stripeCurrency: payment.stripeCurrency, createdAt: dates.format(payment.createdAt), paidAt: date(payment.paidAt),
      dueAt: date(engagement.paymentDueAt), overdue: overdueIds.has(engagement.id),
      disputed: engagement.status === "DISPUTED",
      payout: payout ? { createdAt: dates.format(payout.createdAt), reversedAt: date(payout.reversedAt) } : null,
      refund: refund ? {
        status: refund.status, reason: refund.reason, completedAt: date(refund.completedAt),
        createdAt: dates.format(refund.createdAt), stripeRefundId: refund.stripeRefundId,
      } : null,
    };
  });
  return <div className={styles.page}>
    <PageHeading title="Gestion financière" description="Suivez les paiements de test, les versements simulés et les paramètres de commission." />
    <nav className={styles.navigation} aria-label="Navigation financière">
      <a href="#synthese">Synthèse</a>
      <a href="#transactions">Transactions</a>
      <a href="#suivi">Suivi et contrats</a>
      <a href="#parametres">Paramètres</a>
    </nav>
    <section id="synthese" aria-label="Synthèse financière">
      <FinancialOverview role="ADMIN" userId={admin.id} />
    </section>
    <section id="transactions" aria-label="Transactions">
      <Panel title="Transactions" description="Le total du contrat est en DT. Les montants Stripe correspondent à des paiements en mode test.">
        <TransactionTable rows={rows} />
      </Panel>
    </section>
    <section id="suivi" aria-label="Suivi et contrats" className={styles.section}>
    <details className={styles.disclosure} open={overdue.length > 0}>
      <summary>Paiements en retard <span>{overdue.length}</span></summary>
      {overdue.length === 0 ? <p className={styles.empty}>Aucun paiement arrivé à échéance.</p> : <div className="rq-table-scroll"><table className="rq-table">
        <thead><tr><th>Recruteur</th><th>Mission</th><th>Échéance (Tunis)</th></tr></thead>
        <tbody>{overdue.map(item => {
          const { title, recruiter } = item.application.mission;
          return <tr key={item.id}><td>{recruiter.firstName} {recruiter.name}</td><td>{title}</td><td>{item.paymentDueAt && dates.format(item.paymentDueAt)}</td></tr>;
        })}</tbody>
      </table></div>}
    </details>
    <details className={styles.disclosure}>
      <summary>Versements simulés</summary>
      {transactions.every(payment => !payment.payout) ? <p className={styles.empty}>Aucun versement simulé enregistré.</p> :
        <div className="rq-table-scroll"><table className="rq-table">
          <thead><tr><th>Travailleur</th><th>Mission</th><th>Rémunération</th><th>Date (Tunis)</th><th>Statut</th></tr></thead>
          <tbody>{transactions.flatMap(payment => {
            if (!payment.payout) return [];
            const { worker, mission } = payment.engagement.application;
            return [<tr key={payment.id}>
              <td>{worker.firstName} {worker.name}</td><td>{mission.title}</td>
              <td>{formatDinars(payment.engagement.workerMillimes)}</td><td>{dates.format(payment.payout.createdAt)}</td>
              <td>{payment.payout.reversedAt ? "Annulé par remboursement" : "Versement simulé"}</td>
            </tr>];
          })}</tbody>
        </table></div>}
    </details>
    <details id="contrats" className={styles.disclosure}>
      <summary>Contrats, litiges et remboursements</summary>
      <ContractList role="ADMIN" userId={admin.id} />
    </details>
    </section>
    <section id="parametres" aria-label="Paramètres financiers" className={styles.section}>
    <Panel title="Paramètres financiers">
      <p className="px-6 pt-4 text-sm">Dernière modification le {dates.format(settings.updatedAt)} (heure de Tunis)</p>
      <FinancialSettingsForm settings={settings} />
    </Panel>
    <details className={styles.disclosure}>
      <summary>Historique des taux de commission</summary>
      {history.length === 0 ? <p className={styles.empty}>Aucune modification de commission enregistrée.</p> :
        <div className="rq-table-scroll"><table className="rq-table">
          <thead><tr><th>Date (Tunis)</th><th>Administrateur</th><th>Ancien taux</th><th>Nouveau taux</th></tr></thead>
          <tbody>{history.map(change => <tr key={change.id}>
            <td>{dates.format(change.createdAt)}</td>
            <td>{change.admin.firstName} {change.admin.name}</td>
            <td>{change.previousBps / 100} %</td>
            <td>{change.newBps / 100} %</td>
          </tr>)}</tbody>
        </table></div>}
    </details>
    </section>
  </div>;
}
