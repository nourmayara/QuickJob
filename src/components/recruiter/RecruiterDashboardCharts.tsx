import { useId, type CSSProperties } from "react";
import SoftIcon from "@/components/SoftIcon";

type Point = { label: string; value: number; color?: string };
const format = (n: number) => n.toLocaleString("fr-FR");
const percent = (n: number, total: number) => (total ? n / total * 100 : 0).toLocaleString("fr-FR", { maximumFractionDigits: 1 });
const colors = ["#2368ff", "#a259fa", "#ffca24", "#35b8ef", "#58cba4", "#fc93b6"];

export function ApplicationTrend({ points }: { points: Point[] }) {
  const id = useId().replace(/:/g, "");
  const top = Math.ceil(Math.max(4, ...points.map(p => p.value)) / 4) * 4;
  const coords = points.map((p, i) => [44 + i * 480 / Math.max(1, points.length - 1), 185 - p.value / top * 152]);
  const line = coords.map(([x, y], i) => i ? `C ${(coords[i - 1][0] + x) / 2} ${coords[i - 1][1]}, ${(coords[i - 1][0] + x) / 2} ${y}, ${x} ${y}` : `M ${x} ${y}`).join(" ");
  return <figure className="rqs-trend"><svg viewBox="0 0 560 230" role="img" aria-label="Candidatures reçues au cours des six derniers mois">
    <defs><linearGradient id={`${id}-area`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#8052fa" stopOpacity=".38" /><stop offset="1" stopColor="#397bff" stopOpacity=".02" /></linearGradient><linearGradient id={`${id}-line`}><stop stopColor="#078bff" /><stop offset="1" stopColor="#7523f6" /></linearGradient></defs>
    {[0, 1, 2, 3, 4].map(i => <g key={i}><line x1="44" x2="524" y1={33 + i * 38} y2={33 + i * 38} stroke="#cad9f4" /><text x="33" y={37 + i * 38} textAnchor="end">{format(top * (4 - i) / 4)}</text></g>)}
    <path d={`${line} L 524 185 L 44 185 Z`} fill={`url(#${id}-area)`} /><path d={line} fill="none" stroke={`url(#${id}-line)`} strokeWidth="3.5" />
    {coords.map(([x, y], i) => <g className="rqs-point" key={points[i].label} tabIndex={0} aria-label={`${points[i].label} : ${points[i].value} candidatures`}><title>{`${points[i].label} : ${format(points[i].value)} candidatures`}</title><circle cx={x} cy={y} r="5" stroke={i < 2 ? "#1680ff" : "#7141f4"} strokeWidth="3" fill="#f6f9ff" /><text x={x} y="215" textAnchor="middle">{points[i].label}</text><g className="rqs-tooltip"><rect x={Math.max(44, Math.min(x - 43, 438))} y={Math.max(1, y - 36)} width="86" height="26" rx="8" fill="#3632a6" /><text x={Math.max(87, Math.min(x, 481))} y={Math.max(18, y - 18)} textAnchor="middle">{format(points[i].value)} reçue(s)</text></g></g>)}
  </svg><figcaption>Six derniers mois · heure de Tunisie · mois courant en cours.<span className="sr-only">{points.map(p => `${p.label} : ${p.value}`).join(" ; ")}</span></figcaption></figure>;
}

export function MissionDistribution({ points }: { points: Point[] }) {
  const total = points.reduce((n, p) => n + p.value, 0);
  const shown = points.filter((p, i) => p.value || i < 2);
  return <figure className="rqs-distribution"><div className="rqs-ring"><svg viewBox="0 0 200 200" role="img" aria-label={`${format(total)} missions au total`}><circle cx="100" cy="100" r="78" fill="none" stroke="#dce5f8" strokeWidth="29" />{points.map((p, i) => p.value > 0 && <circle key={p.label} cx="100" cy="100" r="78" fill="none" stroke={p.color || colors[i % colors.length]} strokeWidth="29" pathLength="100" strokeDasharray={`${p.value / total * 100} ${100 - p.value / total * 100}`} strokeDashoffset={-points.slice(0, i).reduce((sum, v) => sum + v.value, 0) / total * 100} transform="rotate(-90 100 100)"><title>{`${p.label} : ${p.value} (${percent(p.value, total)} %)`}</title></circle>)}</svg><div><strong data-kpi="totalMissions" data-value={total}>{format(total)}</strong><span>Missions</span></div></div><figcaption><ul>{shown.map(p => <li key={p.label}><span><i style={{ background: p.color }} />{p.label}</span><strong>{percent(p.value, total)} % <small>({format(p.value)})</small></strong></li>)}</ul><p>{total ? "Toutes vos missions, tous statuts confondus." : "Aucune mission enregistrée."}</p></figcaption></figure>;
}

export function MissionCategories({ points }: { points: Point[] }) {
  const max = Math.max(1, ...points.map(p => p.value));
  return <figure className="rqs-categories">{points.length ? <ul>{points.map((p, i) => <li key={p.label}><span>{p.label}</span><div className="rqs-track" style={{ "--rqs-width": `${p.value / max * 100}%`, "--rqs-color": colors[i % colors.length] } as CSSProperties}><i /></div><strong>{format(p.value)}</strong></li>)}</ul> : <p className="rqs-empty">Vos catégories apparaîtront après votre première mission.</p>}<figcaption>Toutes vos missions · huit catégories principales et autres.</figcaption></figure>;
}

export function RecruitmentFunnel({ total, pending, hired }: { total: number; pending: number; hired: number }) {
  const steps = [{ label: "Candidatures reçues", value: total, color: "#9f60fa" }, { label: "En évaluation", value: pending, color: "#2582ff" }, { label: "Recrutements réalisés", value: hired, color: "#ffca28" }];
  return <figure className="rqs-funnel"><div className="rqs-funnel-body"><div className="rqs-stages">{steps.map((step, i) => <div className={`rqs-stage rqs-stage-${i}`} key={step.label}><div className="rqs-stage-shape" style={{ background: `linear-gradient(160deg,#ffffff60,transparent 70%),${step.color}` }} /><SoftIcon name={i === 2 ? "check" : "people"} size={22} /><div><strong data-kpi={i === 1 ? "pending" : i === 2 ? "hired" : "funnelApplications"} data-value={step.value}>{format(step.value)}</strong><span>{step.label}</span></div></div>)}</div><div className="rqs-conversion"><SoftIcon name="check" tone="yellow" size={28} /><span>Taux de recrutement</span><strong data-kpi="hiringRate" data-value={total ? hired / total * 100 : 0}>{percent(hired, total)} %</strong><p>{format(hired)} candidature(s) acceptée(s) sur {format(total)} reçue(s).</p></div></div><figcaption>En évaluation = en attente de décision. Effectifs actuels, sans historique de passage entre les étapes. Un recrutement correspond à une candidature acceptée.</figcaption></figure>;
}
