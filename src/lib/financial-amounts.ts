export function parseCommissionBps(value: string) {
  const match = /^(\d{1,3})(?:[.,](\d{1,2}))?$/.exec(value.trim());
  if (!match) return null;
  const bps = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return bps <= 10_000 ? bps : null;
}

export function calculateEngagementAmounts(workerMillimes: number, commissionBps: number) {
  if (!Number.isInteger(workerMillimes) || workerMillimes < 0 || workerMillimes > 1_000_000_000 ||
      !Number.isInteger(commissionBps) || commissionBps < 0 || commissionBps > 10_000) {
    throw new RangeError("Conditions financières invalides");
  }
  const commissionMillimes = Math.floor((workerMillimes * commissionBps + 5_000) / 10_000);
  return { workerMillimes, commissionMillimes, totalMillimes: workerMillimes + commissionMillimes };
}

export function formatDinars(millimes: number) {
  return `${new Intl.NumberFormat("fr-TN", { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(millimes / 1000)} DT`;
}
