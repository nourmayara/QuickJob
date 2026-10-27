export type Vec3 = [number, number, number];
// Leave a generous forecourt so street-level views include the whole facade.
export const recruiterLocations = { warehouseZ: -8.3, workspaceZ: -9 };
export const journeyStages = [
 { label: "Découvrir", start: 0, end: .2, destination: 0 },
 { label: "Trouver", start: .2, end: .6, destination: .265 },
 { label: "Recruter", start: .6, end: .8, destination: .62 },
 { label: "Rejoindre", start: .8, end: 1, destination: .98 },
];
export type CityMission = { id: string; title: string; city: string; pay: number; duration: string; date: string; category: string; anchor: Vec3; description: string };
export const cityMissions: CityMission[] = [
 { id: "restaurant", title: "Serveur événementiel", city: "La Marsa", pay: 50, duration: "5 heures", date: "17 octobre 2026", category: "Restauration", anchor: [-7, 4.2, 4], description: "Accueil des invités, mise en place et service lors d’un événement. Une mission au cœur d’une équipe de restauration." },
 { id: "boutique", title: "Inventaire boutique", city: "Tunis", pay: 45, duration: "4 heures", date: "18 octobre 2026", category: "Commerce", anchor: [0, 4.1, 5], description: "Compter, vérifier et organiser les stocks d’une boutique. Une mission pour les profils rigoureux et ponctuels." },
 { id: "event", title: "Agent d’accueil", city: "Hammamet", pay: 60, duration: "6 heures", date: "24 octobre 2026", category: "Événementiel", anchor: [7, 4.8, 2], description: "Accueillir et orienter les visiteurs d’un événement professionnel, en lien avec l’équipe d’organisation." },
 { id: "warehouse", title: "Préparation de commandes", city: "Ben Arous", pay: 55, duration: "5 heures", date: "25 octobre 2026", category: "Logistique", anchor: [-7, 4.3, recruiterLocations.warehouseZ], description: "Préparer, étiqueter et organiser les colis avec l’équipe de l’entrepôt." },
 { id: "workspace", title: "Assistant administratif", city: "Tunis", pay: 65, duration: "6 heures", date: "26 octobre 2026", category: "Administratif", anchor: [3.5, 5.8, recruiterLocations.workspaceZ], description: "Accompagner une équipe dans le classement de documents et la préparation de dossiers." },
];
export const chapters = [
 { label: "La ville", scene: "Missions courtes. Rencontres utiles.", title: "Trouvez une mission. Ou trouvez le bon renfort.", description: "QuickJob connecte les travailleurs disponibles et les recruteurs pour des missions de quelques heures ou quelques jours." },
 { label: "Les missions", scene: "Côté travailleur · Trouver une mission", title: "Des missions qui s’adaptent à votre emploi du temps.", description: "Restaurant, boutique, événement : explorez les missions près de chez vous, puis consultez les détails de celle qui vous correspond." },
 { label: "Votre parcours", scene: "Côté travailleur · Votre candidature", title: "Votre candidature. Le début d’une rencontre.", description: "Découvrez le parcours d’une candidature : votre dossier rejoint le recruteur, qui vous confirme ensuite sa sélection." },
 { label: "Vous recrutez", scene: "Côté recruteur · Votre mission, votre équipe", title: "Besoin de personnel ? Publiez votre mission en quelques clics.", description: "Décrivez votre besoin, recevez des candidatures et choisissez les travailleurs qui vous conviennent." },
 { label: "À vous de jouer", scene: "À vous de choisir votre prochain pas", title: "QuickJob. Les opportunités sont partout.", description: "La visite se termine. Explorez les missions si vous cherchez du travail, ou publiez une mission si vous avez besoin de renfort." },
];
export const workerSteps = ["Explorer les missions", "Consulter les détails", "Envoyer sa candidature", "Recevoir une confirmation"];
export const recruiterSteps = ["Publier une mission", "Consulter les candidatures", "Sélectionner", "Organiser"];
export const demoCandidates = [
 { id: "ines", name: "Inès B.", initials: "IB", skills: "Service · Accueil", rating: "4,9", experience: "Service en salle et accueil lors d’événements. Disponible sur le créneau présenté." },
 { id: "youssef", name: "Youssef M.", initials: "YM", skills: "Restauration · Événementiel", rating: "4,8", experience: "Mise en place, service et travail en équipe lors de réceptions." },
 { id: "sarah", name: "Sarah K.", initials: "SK", skills: "Accueil · Organisation", rating: "4,9", experience: "Accueil des invités et coordination du service. Disponible à La Marsa." },
];
export type DemoCandidate = (typeof demoCandidates)[number];
export function getRecruitMoment(progress: number) {
 return progress < .648 ? 0 : progress < .672 ? 1 : progress < .738 ? 2 : progress < .758 ? 3 : 4;
}
export type TourState = { progress: number; invalidate: (() => void) | null };

// Camera and target are sampled together on one continuous, reversible path.
export const cameraStops: { at: number; position: Vec3; target: Vec3 }[] = [
 { at: 0, position: [26, 27, 33], target: [0, 0, 0] },
 { at: .14, position: [-10, 8, 18], target: [-7, 1.8, 4] },
 { at: .2, position: [-8, 3.5, 12], target: [-7, 1.8, 4] },
 { at: .265, position: [-7, 3.2, 11], target: [-7, 1.8, 4] },
 { at: .33, position: [0, 3.2, 12], target: [0, 1.9, 5] },
 { at: .395, position: [7, 3.3, 11], target: [7, 2, 2] },
 // Turn around the event hall, then enter the open street between the blocks.
 { at: .45, position: [13, 3.3, 7], target: [10, 1.8, 0] },
 { at: .5, position: [13, 3.2, -1.5], target: [6, 1.8, -1.5] },
 { at: .55, position: [7, 3.2, -1.5], target: [0, 1.8, -1] },
 { at: .6, position: [0, 3.2, -.5], target: [-7, 2, recruiterLocations.warehouseZ] },
 // Both recruiter buildings face +Z: visit their entrances, never their roofs.
 { at: .65, position: [-7, 3.2, .3], target: [-7, 2, recruiterLocations.warehouseZ] },
 { at: .7, position: [-2, 3.2, -1.3], target: [3.5, 2.7, recruiterLocations.workspaceZ] },
 { at: .76, position: [3.5, 3.2, -1.3], target: [3.5, 2.7, recruiterLocations.workspaceZ] },
 { at: .8, position: [11, 4, -1.5], target: [3.5, 2.7, recruiterLocations.workspaceZ] },
 { at: .9, position: [18, 15, 17], target: [0, 1, 0] },
 { at: 1, position: [27, 26, 32], target: [0, 0, 0] },
];
