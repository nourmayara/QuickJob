import { DatabaseSync } from "node:sqlite";
import { copyFile, mkdir, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const prismaDirectory = path.join(root, "prisma");
const env = await readFile(path.join(root, ".env"), "utf8");
const configuredUrl = env.match(/^DATABASE_URL\s*=\s*["']?([^"'\r\n]+)["']?/m)?.[1];

if (!configuredUrl?.startsWith("file:")) {
  throw new Error("DATABASE_URL doit désigner une base SQLite file:.");
}

const configuredPath = configuredUrl.slice(5);
const databasePath = await realpath(path.isAbsolute(configuredPath)
  ? configuredPath
  : path.resolve(prismaDirectory, configuredPath));
const backupDirectory = path.join(prismaDirectory, "backups");
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupPath = path.join(backupDirectory, `before-mission-title-cleanup-${timestamp}.db`);

function technicalPrefix(title) {
  const closingBracket = title.indexOf("]");
  if (closingBracket < 0) return null;
  const prefix = title.slice(0, closingBracket + 1);
  if (prefix === "[AI-SCENARIO]") return prefix;
  if (!prefix.startsWith("[AI-DATASET ")) return null;
  const sequence = prefix.slice("[AI-DATASET ".length, -1);
  return sequence && [...sequence].every(character => character >= "0" && character <= "9") ? prefix : null;
}

await mkdir(backupDirectory, { recursive: true });
await copyFile(databasePath, backupPath);

const backup = new DatabaseSync(backupPath, { readOnly: true });
const integrity = backup.prepare("PRAGMA integrity_check").get().integrity_check;
backup.close();
if (integrity !== "ok") throw new Error(`Sauvegarde SQLite invalide : ${integrity}`);

const database = new DatabaseSync(databasePath, { timeout: 15_000 });
database.exec("PRAGMA busy_timeout = 15000");
const missions = database.prepare("SELECT id, title FROM Mission ORDER BY id").all();
const emptyTitles = [];
const corrections = [];

for (const mission of missions) {
  const prefix = technicalPrefix(mission.title);
  if (!prefix) continue;
  const cleanedTitle = mission.title.slice(prefix.length).trimStart();
  if (!cleanedTitle) emptyTitles.push({ id: Number(mission.id), title: mission.title });
  else corrections.push({ id: Number(mission.id), before: mission.title, after: cleanedTitle });
}

if (emptyTitles.length) {
  database.close();
  throw new Error(`Titres composés uniquement d’un préfixe, laissés inchangés : ${JSON.stringify(emptyTitles)}`);
}

database.exec("BEGIN IMMEDIATE");
try {
  const update = database.prepare("UPDATE Mission SET title = ? WHERE id = ? AND title = ?");
  for (const correction of corrections) {
    const result = update.run(correction.after, correction.id, correction.before);
    if (Number(result.changes) !== 1) throw new Error(`Mission ${correction.id} modifiée concurremment.`);
  }
  database.exec("COMMIT");
} catch (error) {
  database.exec("ROLLBACK");
  throw error;
} finally {
  database.close();
}

console.log(JSON.stringify({
  databasePath,
  backupPath,
  corrected: corrections.length,
  emptyTitles,
  examples: corrections.slice(0, 10),
}, null, 2));
