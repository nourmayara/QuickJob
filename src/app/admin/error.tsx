"use client";
export default function AdminError({ reset }: { reset: () => void }) { return <div className="rq-error" role="alert"><p>Impossible de charger cet écran. Veuillez réessayer.</p><button className="rq-button" onClick={reset}>Réessayer</button></div>; }
