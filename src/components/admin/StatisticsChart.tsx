export default function StatisticsChart({ points, name }: { points: { label: string; value: number }[]; name: string }) {
  const max = Math.max(1, ...points.map(p => p.value));
  if (points.length === 0 || points.every(p => p.value === 0)) return <p className="qa-empty">Aucune donnée pour cette période ou cette répartition.</p>;
  return <figure className="qa-stat-chart" aria-label={name}><figcaption className="sr-only">{name}. Nombre d’enregistrements pour chaque valeur.</figcaption><ul>{points.map((p, i) => <li key={`${p.label}-${i}`}><span>{p.label}</span><div className="qa-chart-track" aria-hidden="true"><i style={{ width: `${p.value / max * 100}%` }} /></div><strong>{p.value.toLocaleString("fr-FR")}</strong></li>)}</ul></figure>;
}
