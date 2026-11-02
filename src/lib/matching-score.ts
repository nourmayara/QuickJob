function normalizeMatchValue(value: string) {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").trim().replace(/\s+/g, " ").toLocaleLowerCase("fr");
}

export const MATCHING_CRITERIA_VERSION = "quickjob-v1";

export type MatchingWeights = {
  skills: number;
  category: number;
  location: number;
  availability: number;
  experience: number;
};

export const DEFAULT_MATCHING_WEIGHTS: Readonly<MatchingWeights> = Object.freeze({
  skills: 0.35,
  category: 0.15,
  location: 0.15,
  availability: 0.2,
  experience: 0.15,
});

export type MatchInput = {
  worker: {
    city?: string | null;
    skillKeys: string[];
    preferredCategories: string[];
    experienceMonths?: number | null;
    availabilities: { startAt: Date; endAt: Date; kind: string }[];
  };
  mission: {
    city?: string | null;
    category?: string | null;
    requiredSkillKeys: string[];
    requiredExperienceMonths?: number | null;
    startAt?: Date | null;
    endAt?: Date | null;
  };
};

export type CriterionResult = {
  score: number;
  weight: number;
  points: number;
  explanation: string;
};

export type MatchResult = {
  score: number;
  criteriaVersion: string;
  criteria: Record<keyof MatchingWeights, CriterionResult>;
};

function validateWeights(weights: MatchingWeights) {
  const values = Object.values(weights);
  if (values.some(value => !Number.isFinite(value) || value < 0) || values.every(value => value === 0)) {
    throw new Error("Les pondérations de matching doivent être positives et leur somme non nulle.");
  }
}

function criterion(score: number, weight: number, explanation: string): CriterionResult {
  const bounded = Math.max(0, Math.min(1, score));
  return { score: Math.round(bounded * 100), weight, points: Math.round(bounded * weight * 100), explanation };
}

export function scoreMatch(input: MatchInput, weights: MatchingWeights = { ...DEFAULT_MATCHING_WEIGHTS }): MatchResult {
  validateWeights(weights);
  const workerSkills = new Set(input.worker.skillKeys.map(normalizeMatchValue));
  const requiredSkills = [...new Set(input.mission.requiredSkillKeys.map(normalizeMatchValue))];
  const matchedSkills = requiredSkills.filter(skill => workerSkills.has(skill));
  const skillsRatio = requiredSkills.length ? matchedSkills.length / requiredSkills.length : 1;

  const category = normalizeMatchValue(input.mission.category ?? "");
  const categoryMatch = category
    ? input.worker.preferredCategories.map(normalizeMatchValue).includes(category)
    : false;

  const workerCity = normalizeMatchValue(input.worker.city ?? "");
  const missionCity = normalizeMatchValue(input.mission.city ?? "");
  const locationMatch = Boolean(workerCity && missionCity && workerCity === missionCity);

  let availabilityScore = 0;
  let availabilityExplanation = "Créneau de mission ou disponibilités non renseignés.";
  if (input.mission.startAt && input.mission.endAt) {
    const overlaps = input.worker.availabilities.filter(slot => slot.startAt < input.mission.endAt! && slot.endAt > input.mission.startAt!);
    if (overlaps.some(slot => slot.kind === "UNAVAILABLE")) {
      availabilityExplanation = "Une indisponibilité déclarée chevauche la mission.";
    } else if (overlaps.some(slot => slot.kind === "AVAILABLE" && slot.startAt <= input.mission.startAt! && slot.endAt >= input.mission.endAt!)) {
      availabilityScore = 1;
      availabilityExplanation = "Une disponibilité déclarée couvre tout le créneau.";
    } else {
      availabilityExplanation = "Aucune disponibilité déclarée ne couvre tout le créneau.";
    }
  }

  const requiredMonths = input.mission.requiredExperienceMonths;
  const workerMonths = input.worker.experienceMonths;
  const experienceScore = !requiredMonths || requiredMonths <= 0 ? 1
    : typeof workerMonths === "number" ? Math.min(1, workerMonths / requiredMonths) : 0;

  const criteria: MatchResult["criteria"] = {
    skills: criterion(skillsRatio, weights.skills, requiredSkills.length
      ? `${matchedSkills.length}/${requiredSkills.length} compétence(s) requise(s) correspondent.`
      : "Aucune compétence structurée n’est exigée."),
    category: criterion(categoryMatch ? 1 : 0, weights.category, !category
      ? "Catégorie de mission non renseignée."
      : categoryMatch ? "La catégorie figure dans les préférences du travailleur." : "La catégorie ne figure pas dans les préférences déclarées."),
    location: criterion(locationMatch ? 1 : 0, weights.location, locationMatch
      ? "La ville du profil correspond à celle de la mission." : "La ville ne correspond pas ou n’est pas renseignée."),
    availability: criterion(availabilityScore, weights.availability, availabilityExplanation),
    experience: criterion(experienceScore, weights.experience, !requiredMonths || requiredMonths <= 0
      ? "Aucune durée minimale d’expérience n’est exigée."
      : typeof workerMonths === "number" ? `${workerMonths} mois vérifiables pour ${requiredMonths} mois requis.` : "Expérience structurée non renseignée."),
  };
  const totalWeight = Object.values(weights).reduce((sum, value) => sum + value, 0);
  const weightedScore = (Object.values(criteria).reduce((sum, item) => sum + item.score * item.weight, 0) / totalWeight);
  return { score: Math.round(weightedScore), criteriaVersion: MATCHING_CRITERIA_VERSION, criteria };
}
