import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { formatDinars } from "@/lib/financial-amounts";
import { Panel } from "@/components/recruiter/ui";
import styles from "@/app/admin/finance/finance.module.css";

export default async function FinancialOverview({ role, userId }: { role: string; userId: number }) {
  const scope: Prisma.EngagementWhereInput = role === "ADMIN" ? {} : {
    application: role === "RECRUTEUR" ? { mission: { recruiterId: userId } } : { workerId: userId },
  };
  const now = new Date();
  const [paid, pending, late, disputes, outstandingContracts, transactions, currencies, refunds] = await Promise.all([
    prisma.engagement.aggregate({
      where: { ...scope, payment: { status: "SUCCEEDED", payout: { isNot: null } } },
      _sum: { workerMillimes: true, commissionMillimes: true, totalMillimes: true },
    }),
    prisma.engagement.aggregate({
      where: { ...scope, status: "AWAITING_PAYMENT", checkedOutAt: { not: null } },
      _sum: { workerMillimes: true, totalMillimes: true }, _count: { _all: true },
    }),
    prisma.engagement.count({ where: { ...scope, status: "AWAITING_PAYMENT", checkedOutAt: { not: null }, paymentDueAt: { lt: now } } }),
    prisma.engagement.count({ where: { ...scope, status: "DISPUTED" } }),
    prisma.engagementContract.count({
      where: { party: role, acceptedAt: null, engagement: { ...scope, status: "AWAITING_CONTRACTS", startAt: { gt: now } } },
    }),
    prisma.engagementPayment.count({ where: { engagement: scope } }),
    role === "ADMIN" ? prisma.engagementPayment.groupBy({
      by: ["stripeCurrency"], where: { status: "SUCCEEDED" }, _sum: { stripeAmount: true },
    }) : [],
    role === "ADMIN" ? prisma.engagement.aggregate({
      where: { payment: { status: "REFUNDED" } }, _sum: { commissionMillimes: true },
    }) : null,
  ]);
  const amount = (millimes: number | null) => formatDinars(millimes ?? 0);
  if (role === "ADMIN") {
    const received = currencies.length ? currencies.map(({ stripeCurrency, _sum }) =>
      new Intl.NumberFormat("fr-FR", { style: "currency", currency: stripeCurrency }).format((_sum.stripeAmount ?? 0) / 100),
    ) : [new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(0)];
    const metrics = [
      { label: "Paiements reçus", values: received, note: "Stripe en mode test, après remboursements." },
      { label: "Commissions QuickJob", values: [amount((paid._sum.commissionMillimes ?? 0) + (refunds?._sum.commissionMillimes ?? 0))], note: "Frais de service contractuels, avant annulations." },
      { label: "Rémunérations versées", values: [amount(paid._sum.workerMillimes)], note: "Versements simulés aux travailleurs." },
      { label: "Paiements en attente", values: [pending._count._all], note: `${amount(pending._sum.workerMillimes)} de rémunérations restant à verser en simulation.` },
    ];
    return <Panel title="Synthèse financière">
      <dl className={styles.metrics}>
        {metrics.map(({ label, values, note }) => <div key={label} className={styles.metric}>
          <dt>{label}</dt>
          <dd>{values.map(value => <span key={value}>{value}</span>)}</dd>
          <dd className={styles.metricNote}>{note}</dd>
        </div>)}
      </dl>
      <dl className={styles.secondaryMetrics}>
        <div><dt>En retard</dt><dd>{late}</dd></div>
        <div><dt>Litiges ouverts</dt><dd>{disputes}</dd></div>
        <div><dt>Transactions enregistrées</dt><dd>{transactions}</dd></div>
        <div><dt>Commissions annulées après remboursement</dt><dd>{amount(refunds?._sum.commissionMillimes ?? 0)}</dd></div>
      </dl>
    </Panel>;
  }
  const cards: [string, string | number][] = role === "TRAVAILLEUR" ? [
    ["Gains cumulés en simulation", amount(paid._sum.workerMillimes)],
    ["Rémunérations en attente", amount(pending._sum.workerMillimes)],
    ["Contrats à accepter", outstandingContracts],
  ] : [
    ["Total payé · valeur contractuelle", amount(paid._sum.totalMillimes)],
    ["Engagements à payer", pending._count._all],
    ["Frais de service cumulés", amount(paid._sum.commissionMillimes)],
    ["Contrats à accepter", outstandingContracts],
    ["Paiements en retard", late],
  ];
  return <Panel title="Synthèse financière">
    <dl className="grid grid-cols-1 gap-3 p-6 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map(([label, value]) => <div key={label} className="rounded-xl border border-violet-100 bg-violet-50/50 p-4">
        <dt className="text-sm text-slate-600">{label}</dt>
        <dd className="mt-1 text-xl font-semibold">{value}</dd>
      </div>)}
    </dl>
  </Panel>;
}
