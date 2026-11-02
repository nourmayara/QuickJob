import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { scoreMatch } from "../src/lib/matching-score.ts";
import { RuleBasedSkillExtractor } from "../src/lib/skill-extraction.ts";

const weights = { skills: .4, category: 0, location: .2, availability: .25, experience: .15 };
const startAt = new Date("2035-06-10T08:00:00Z"), endAt = new Date("2035-06-10T12:00:00Z");
const perfect = { worker: { city: "Tunis", skillKeys: ["vente", "encaissement"], preferredCategories: [], experienceMonths: 24, availabilities: [{ startAt, endAt, kind: "AVAILABLE" }] }, mission: { city: "Tunis", category: "Commerce", requiredSkillKeys: ["vente", "encaissement"], requiredExperienceMonths: 12, startAt, endAt } };
assert.equal(scoreMatch(perfect, weights).score, 100, "Un profil entièrement compatible doit obtenir 100");
const partial = structuredClone(perfect); partial.worker.skillKeys = ["vente"]; partial.worker.city = "Sfax"; partial.worker.experienceMonths = 6; partial.worker.availabilities = [];
assert.equal(scoreMatch(partial, weights).score, 28, "Le score partiel pondéré doit être 28");
const unavailable = structuredClone(perfect); unavailable.worker.availabilities = [{ startAt, endAt, kind: "UNAVAILABLE" }];
assert.equal(scoreMatch(unavailable, weights).criteria.availability.score, 0);
assert.throws(() => scoreMatch(perfect, { skills: 0, category: 0, location: 0, availability: 0, experience: 0 }));

const extractor = new RuleBasedSkillExtractor();
assert.deepEqual(await extractor.extract(""), []);
assert.deepEqual(await extractor.extract("J’ai regardé un film hier."), []);

for (const size of [10, 100, 1000]) {
  const inputs = Array.from({ length: size }, (_, index) => { const value = structuredClone(perfect); if (index % 2) value.worker.city = "Sfax"; return value; });
  const started = performance.now();
  const results = inputs.map(input => scoreMatch(input, weights));
  const elapsed = performance.now() - started;
  assert(results.every(result => result.score >= 0 && result.score <= 100));
  console.log(`scoreMatch ${size}: ${elapsed.toFixed(2)} ms`);
}
console.log("Moteur IA: pondérations, bornes, entrées vides et volumes validés.");
