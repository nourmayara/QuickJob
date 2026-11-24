import cityReference from "./tunisia-cities.json";

export type GovernorateMissionPoint = { id: string; name: string; value: number };
type CityReference = { governorate: string; name_en: string; name_fr: string; name_translit: string };

export const governorates = [
  ["TN-11", "Tunis"], ["TN-12", "Ariana"], ["TN-13", "Ben Arous"], ["TN-14", "La Manouba"],
  ["TN-21", "Nabeul"], ["TN-22", "Zaghouan"], ["TN-23", "Bizerte"], ["TN-31", "Béja"],
  ["TN-32", "Jendouba"], ["TN-33", "Le Kef"], ["TN-34", "Siliana"], ["TN-41", "Kairouan"],
  ["TN-42", "Kasserine"], ["TN-43", "Sidi Bouzid"], ["TN-51", "Sousse"], ["TN-52", "Monastir"],
  ["TN-53", "Mahdia"], ["TN-61", "Sfax"], ["TN-71", "Gafsa"], ["TN-72", "Tozeur"],
  ["TN-73", "Kébili"], ["TN-81", "Gabès"], ["TN-82", "Médenine"], ["TN-83", "Tataouine"],
] as const;

export function normalizeTunisianPlace(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[’'`]/g, " ").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

const cityCandidates = new Map<string, Set<string>>();
function register(name: string, governorate: string) {
  const key = normalizeTunisianPlace(name);
  if (!key) return;
  const matches = cityCandidates.get(key) ?? new Set<string>();
  matches.add(governorate);
  cityCandidates.set(key, matches);
}
for (const city of cityReference as CityReference[]) {
  for (const name of [city.name_fr, city.name_en, city.name_translit]) register(name, city.governorate);
}
for (const [id, name] of governorates) register(name, id);
for (const [name, id] of [["Manouba", "TN-14"], ["Kef", "TN-33"], ["Djerba", "TN-82"], ["Jerba", "TN-82"]]) register(name, id);

export function governorateForCity(city: string | null) {
  if (!city) return null;
  const normalized = normalizeTunisianPlace(city).replace(/\s+tunisie$/, "").trim();
  const candidates = cityCandidates.get(normalized);
  return candidates?.size === 1 ? [...candidates][0] : null;
}

export function aggregateMissionsByGovernorate(rows: { city: string | null; count: number }[]) {
  const counts = new Map<string, number>(governorates.map(([id]) => [id, 0]));
  let unmatched = 0;
  for (const row of rows) {
    const governorate = governorateForCity(row.city);
    if (governorate) counts.set(governorate, (counts.get(governorate) ?? 0) + row.count);
    else unmatched += row.count;
  }
  return { points: governorates.map(([id, name]) => ({ id, name, value: counts.get(id) ?? 0 })), unmatched };
}
