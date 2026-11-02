import { useId } from "react";
import type { CSSProperties } from "react";

export type Point = { label: string; value: number; metric?: string; color?: string };
const palette = ["#2864ff", "#a45bfa", "#ffcc32", "#31c98a", "#fa7197", "#8392cb", "#39b8f6", "#b8a2de"];
const number = (v: number) => v.toLocaleString("fr-FR");
const color = (p: Point, i: number) => p.color || palette[i % palette.length];
function Empty() { return <p className="ad-empty">Aucune donnÃ©e enregistrÃ©e.</p>; }

export function LineChart({ points }: { points: Point[] }) {
  const id = useId().replace(/:/g, "");
  const max = Math.max(4, ...points.map(p => p.value));
  const ceiling = Math.ceil(max / 4) * 4;
  const coords = points.map((p, i) => [48 + i * 450 / Math.max(1, points.length - 1), 184 - p.value / ceiling * 156]);
  // Horizontal tangents keep the curve between adjacent real observations.
  const path = coords.map(([x, y], i) => i ? `C ${(coords[i - 1][0] + x) / 2} ${coords[i - 1][1]}, ${(coords[i - 1][0] + x) / 2} ${y}, ${x} ${y}` : `M ${x} ${y}`).join(" ");
  return <figure className="ad-line" aria-label="Inscriptions mensuelles"><svg viewBox="0 0 530 225" role="img" aria-label="Ã‰volution des inscriptions sur six mois"><defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#3974ff" stopOpacity=".38" /><stop offset="1" stopColor="#3974ff" stopOpacity=".02" /></linearGradient></defs>{Array.from({ length: 5 }, (_, i) => <g key={i}><line x1="48" x2="498" y1={28 + i * 39} y2={28 + i * 39} stroke="#dce4fa" /><text x="35" y={32 + i * 39} textAnchor="end">{number(ceiling * (4 - i) / 4)}</text></g>)}<path d={`${path} L 498 184 L 48 184 Z`} fill={`url(#${id})`} /><path d={path} stroke="#3269ff" strokeWidth="3.5" fill="none" />{coords.map(([x, y], i) => <g key={i} tabIndex={0} className="ad-line-point"><title>{points[i].label + " : " + number(points[i].value) + " inscriptions"}</title><circle cx={x} cy={y} r="5" fill="white" stroke="#3269ff" strokeWidth="3" /><text x={x} y="213" textAnchor="middle">{points[i].label}</text><g className="ad-tooltip"><rect x={Math.max(48, Math.min(x - 44, 410))} y={Math.max(0, y - 38)} width="88" height="27" rx="9" fill="#243aa0" /><text x={Math.max(92, Math.min(x, 454))} y={Math.max(18, y - 20)} textAnchor="middle" fill="white">{number(points[i].value)} inscr.</text></g></g>)}</svg><figcaption className="sr-only">{points.map(p => `${p.label} : ${p.value}`).join(" ; ")}</figcaption></figure>;
}

export function DonutChart({ points, label }: { points: Point[]; label: string }) {
  const total = points.reduce((s, p) => s + p.value, 0);

  return <figure className="ad-donut" aria-label={label}><div className="ad-ring"><svg viewBox="0 0 200 200" role="img" aria-label={`${number(total)} ${label}`}><circle cx="100" cy="100" r="77" fill="none" stroke="#e7ecfc" strokeWidth="28" />{points.filter(p => p.value > 0).map(p => { const i = points.indexOf(p); const size = p.value / total * 100; const start = points.slice(0, i).reduce((sum, point) => sum + point.value, 0) / total * 100; return <circle key={p.label} cx="100" cy="100" r="77" fill="none" stroke={color(p, i)} strokeWidth="28" pathLength="100" strokeDasharray={`${size} ${100 - size}`} strokeDashoffset={-start} transform="rotate(-90 100 100)"><title>{p.label + " : " + p.value}</title></circle>; })}</svg><div><strong>{number(total)}</strong><span>{label}</span></div></div><figcaption><ul className="ad-legend">{points.map((p, i) => <li key={p.label}><i style={{ background: color(p, i) }} /><span>{p.label}</span><strong {...(p.metric ? { "data-kpi": p.metric, "data-value": p.value } : {})}>{number(p.value)} <small>({total ? Math.round(p.value / total * 100) : 0} %)</small></strong></li>)}</ul>{!total && <span className="ad-zero">Aucune donnÃ©e enregistrÃ©e.</span>}</figcaption></figure>;
}

export function BarChart({ points, vertical = false }: { points: Point[]; vertical?: boolean }) {
  const max = Math.max(1, ...points.map(p => p.value));
  if (!points.length) return <Empty />;
  return <figure className={vertical ? "ad-bars ad-bars-vertical" : "ad-bars"}><ul>{points.map((p, i) => <li key={p.label} style={{ "--bar-color": color(p, i), "--bar-size": `${p.value / max * 100}%` } as CSSProperties}><span>{p.label}</span><div className="ad-bar-track"><i /><strong>{number(p.value)}</strong></div>{!vertical && <strong>{number(p.value)}</strong>}</li>)}</ul></figure>;
}


