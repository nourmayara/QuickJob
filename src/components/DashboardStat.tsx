import type { IconName } from "@/components/recruiter/Icon";
import SoftIcon from "@/components/SoftIcon";
export default function DashboardStat({ label, value, rawValue, metric, icon, description }: { label: string; value: string | number; rawValue: number | null; metric: string; icon: IconName; description: string }) {
  return <div className="rq-stat"><div className="rq-stat-top"><span>{label}</span><SoftIcon name={icon} variant="glass" /></div><strong data-kpi={metric} data-value={rawValue === null ? "" : rawValue}>{value}</strong><small>{description}</small></div>;
}
