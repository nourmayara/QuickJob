"use client";
export default function DashboardError({ reset }: { reset: () => void }) { return <div role="alert"><p>Impossible de charger les statistiques. Veuillez réessayer.</p><button onClick={reset}>Réessayer</button></div>; }
