// Pure validation only: never opens SQLite or runs the seed.
import assert from "node:assert/strict";
import { buildSeedPlan } from "../prisma/seed.mjs";

const plan = buildSeedPlan(new Date("2026-11-01T12:00:00Z"));
assert.deepEqual([plan.recruiters.length, plan.workers.length, plan.missions.length, plan.applications.length], [8, 15, 30, 40]);
assert.equal(new Set([...plan.recruiters, ...plan.workers].map(user => user.email)).size, 23);
assert.equal(new Set(plan.applications.map(a => `${a.missionIndex}:${a.workerIndex}`)).size, 40);
for (const a of plan.applications) {
  assert.ok(plan.workers[a.workerIndex]);
  assert.notEqual(plan.missions[a.missionIndex].status, "DRAFT");
}
for (const [index, mission] of plan.missions.entries()) {
  const accepted = plan.applications.filter(a => a.missionIndex === index && a.status === "ACCEPTED");
  assert.ok(accepted.length <= mission.capacity);
  assert.ok(mission.recruiterIndex < 5);
  if (mission.status === "FULL") assert.equal(accepted.length, mission.capacity);
  if (mission.status === "COMPLETED") {
    assert.ok(mission.date < new Date(plan.today));
    assert.ok(accepted.length > 0);
  }
}
for (const workerIndex of plan.workers.keys()) {
  const dates = plan.applications.filter(a => a.workerIndex === workerIndex && a.status === "ACCEPTED").map(a => plan.missions[a.missionIndex].date.toISOString());
  assert.equal(dates.length, new Set(dates).size);
}
assert.deepEqual(new Set(plan.applications.map(a => a.status)), new Set(["ACCEPTED", "PENDING", "REJECTED", "CANCELLED"]));
console.log("Plan du seed validé : volumes, unicité, relations, capacités, statuts et horaires. Aucune connexion à la base.");
