"use client";
export default function RecruiterError({ reset }: { reset: () => void }) {
  return <div className="rq-panel rq-error-page"><h1>Votre espace est momentanément indisponible</h1><p>Les informations n’ont pas pu être chargées. Veuillez réessayer.</p><button className="rq-button rq-primary" onClick={reset}>Réessayer</button></div>;
}
