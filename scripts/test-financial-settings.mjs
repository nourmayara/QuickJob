import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { calculateEngagementAmounts, parseCommissionBps } from "../src/lib/financial-amounts.ts";

assert.deepEqual(calculateEngagementAmounts(50_000, 2000), {
  workerMillimes: 50_000, commissionMillimes: 10_000, totalMillimes: 60_000,
});
assert.equal(calculateEngagementAmounts(50_000, 2500).totalMillimes, 62_500);
assert.equal(calculateEngagementAmounts(50_000, parseCommissionBps("17,5")).totalMillimes, 58_750);
assert.equal(calculateEngagementAmounts(1, 5000).commissionMillimes, 1);
assert.equal(calculateEngagementAmounts(50_000, 0).totalMillimes, 50_000);
assert.equal(parseCommissionBps("100.00"), 10_000);
for (const value of ["-1", "100,01", "101", "17,555", "NaN", "1e1", ""]) {
  assert.equal(parseCommissionBps(value), null);
}

const folder = mkdtempSync(join(tmpdir(), "quickjob-finance-"));
const file = join(folder, "finance.db");
const migration = readFileSync(new URL("../prisma/migrations/20261117150000_financial_settings/migration.sql", import.meta.url), "utf8");
let database;
try {
  database = new DatabaseSync(file);
  database.exec('CREATE TABLE "User" ("id" INTEGER PRIMARY KEY); INSERT INTO "User" VALUES (1);');
  database.exec(migration);
  const currentRate = () => database.prepare('SELECT "commissionBps" FROM "FinancialSettings" WHERE "id" = 1').get().commissionBps;
  assert.equal(currentRate(), 2000);
  assert.throws(() => database.exec('UPDATE "FinancialSettings" SET "commissionBps" = 10001'));
  assert.throws(() => database.exec('INSERT INTO "FinancialSettings" ("id", "updatedAt") VALUES (2, CURRENT_TIMESTAMP)'));
  database.exec(`
    BEGIN;
    UPDATE "FinancialSettings" SET "commissionBps" = 1750;
    INSERT INTO "CommissionRateHistory" ("previousBps", "newBps", "adminId") VALUES (2000, 1750, 1);
    COMMIT;
  `);
  database.close();
  database = new DatabaseSync(file);
  assert.equal(currentRate(), 1750);
  database.exec('INSERT OR IGNORE INTO "FinancialSettings" ("id", "updatedAt") VALUES (1, CURRENT_TIMESTAMP)');
  assert.equal(currentRate(), 1750);
  const change = database.prepare('SELECT "previousBps", "newBps", "adminId", "createdAt" FROM "CommissionRateHistory"').get();
  assert.deepEqual([change.previousBps, change.newBps, change.adminId], [2000, 1750, 1]);
  assert.ok(change.createdAt);
} finally {
  database?.close();
  rmSync(folder, { recursive: true });
}
console.log("Montants, validation des taux, migration SQLite et persistance vérifiés.");
