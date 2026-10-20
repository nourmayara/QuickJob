import type { Journey } from "@/lib/journey";
import type { IconName } from "@/components/recruiter/Icon";
import { recruiterLocations, type Vec3 } from "./data";

export type JourneyStep = { label: string; short: string; title: string; accent: string; description: string; detail: string; icon: IconName };
export const journeySteps: Record<Journey, JourneyStep[]> = {
  travailleur: [
    { label: "Découvrir", short: "La mission qui vous correspond", title: "Une mission.", accent: "La bonne rencontre.", description: "Des missions ponctuelles en Tunisie, pour travailler à votre rythme. Consultez les missions publiées, leurs horaires et leur rémunération.", detail: "Choisissez selon votre ville, vos compétences et vos disponibilités.", icon: "search" },
    { label: "Postuler", short: "Votre profil fait le premier pas", title: "Votre profil.", accent: "Vos opportunités.", description: "Présentez vos compétences, ouvrez une mission et envoyez votre candidature. Un message peut accompagner votre profil.", detail: "Vous choisissez les missions auxquelles vous souhaitez postuler.", icon: "user" },
    { label: "Suivre", short: "Gardez le fil de vos candidatures", title: "La suite ?", accent: "Vous restez informé.", description: "Retrouvez vos candidatures dans votre espace et consultez la décision du recruteur. Chaque statut vous indique où vous en êtes.", detail: "En attente, acceptée ou refusée : la réponse reste consultable.", icon: "check" },
  ],
  recruteur: [
    { label: "Publier", short: "Un besoin précis, une mission claire", title: "Le bon renfort.", accent: "Au bon moment.", description: "Décrivez votre besoin, le lieu, les horaires et la rémunération. Publiez une mission ponctuelle pour trouver les travailleurs dont vous avez besoin.", detail: "Vous définissez les compétences et le nombre de places disponibles.", icon: "plus" },
    { label: "Examiner", short: "Les profils derrière les candidatures", title: "Des candidatures.", accent: "À vous de découvrir.", description: "Consultez les candidatures reçues pour vos missions. Compétences, expérience et message du travailleur vous aident à faire votre choix.", detail: "Toutes les candidatures de vos missions sont réunies dans votre espace.", icon: "people" },
    { label: "Sélectionner", short: "Votre équipe prend forme", title: "Votre équipe.", accent: "Votre choix.", description: "Acceptez ou refusez les candidatures et suivez les places occupées. Votre mission devient complète lorsque tous les travailleurs sont sélectionnés.", detail: "Vos décisions sont visibles par les travailleurs dans leur espace.", icon: "check" },
  ],
};
export const cityPlaces: { id: string; label: string; description: string; anchor: Vec3; icon: IconName }[] = [
  { id: "restaurant", label: "Restauration", description: "Service, accueil et renfort en restauration.", anchor: [-7, 6.1, 4], icon: "briefcase" },
  { id: "boutique", label: "Commerce", description: "Vente, inventaire et vie des boutiques.", anchor: [0, 5.2, 5], icon: "grid" },
  { id: "event", label: "Événementiel", description: "Accueil et organisation de vos événements.", anchor: [7, 6.6, 2], icon: "people" },
  { id: "warehouse", label: "Logistique", description: "Préparation, organisation et renfort logistique.", anchor: [-7, 3.8, recruiterLocations.warehouseZ], icon: "briefcase" },
  { id: "workspace", label: "Bureaux", description: "Organisation et accompagnement administratif.", anchor: [3.5, 8.6, recruiterLocations.workspaceZ], icon: "user" },
];
export type CityView = { position: Vec3; target: Vec3; progress: number };
const placeProgress: Record<string, number> = { restaurant: .08, boutique: .28, event: .43, warehouse: .72, workspace: 1 };
export function cityView(journey: Journey, step: number, placeId: string | null, overview: boolean): CityView {
  const progress = placeId ? placeProgress[placeId] ?? 0 : (journey === "travailleur" ? [0, .38, .78] : [.5, .82, 1])[step];
  if (overview) return { position: [24, 24.4, 24], target: [0, .4, 0], progress };
  const place = cityPlaces.find(item => item.id === placeId);
  const target: Vec3 = place ? [place.anchor[0] * .15, .4, place.anchor[2] * .15] : step === 0 ? [0, .4, 0] : [.5, .4, -.7];
  return { position: [target[0] + 24, 24.4, target[2] + 24], target, progress };
}
