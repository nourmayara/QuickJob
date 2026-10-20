import Link from "next/link";
import ConfirmAction from "./ConfirmAction";

export default function MissionActions({ id, status, compact = false }: { id: number; status: string; compact?: boolean }) {
  const editable = ["DRAFT", "PUBLISHED", "FULL"].includes(status);
  const active = ["DRAFT", "PUBLISHED", "FULL", "CLOSED", "IN_PROGRESS"].includes(status);
  return <div className={compact ? "rq-table-actions" : "rq-detail-actions"}>
    <Link className={compact ? "rq-link" : "rq-button"} href={`/recruteur/missions/${id}`}>Voir</Link>
    {editable && <Link className={compact ? "rq-link" : "rq-button"} href={`/recruteur/missions/${id}/modifier`}>Modifier</Link>}
    <Link className={compact ? "rq-link" : "rq-button"} href={`/recruteur/candidatures?mission=${id}`}>Candidatures</Link>
    {!compact && ["PUBLISHED", "FULL"].includes(status) && <ConfirmAction endpoint={`/api/missions/${id}`} data={{ status: "CLOSED" }} label="Clôturer les candidatures" title="Clôturer cette mission ?" description="Les nouvelles candidatures et sélections seront fermées. Les travailleurs déjà sélectionnés seront conservés." />}
    {!compact && ["PUBLISHED", "FULL", "CLOSED"].includes(status) && <ConfirmAction endpoint={`/api/missions/${id}`} data={{ status: "IN_PROGRESS" }} label="Démarrer la mission" title="Démarrer cette mission ?" description="La mission passera au statut En cours et ne pourra plus être modifiée." />}
    {!compact && ["CLOSED", "IN_PROGRESS"].includes(status) && <ConfirmAction endpoint={`/api/missions/${id}`} data={{ status: "COMPLETED" }} label="Terminer la mission" title="Terminer cette mission ?" description="La mission sera marquée comme terminée. Cette décision est définitive." />}
    {active && <ConfirmAction endpoint={`/api/missions/${id}`} data={{ status: "CANCELLED" }} label="Annuler" title="Annuler cette mission ?" description="Cette mission ne sera plus disponible. Les candidatures resteront dans votre historique. Cette décision est définitive." danger />}
  </div>;
}
