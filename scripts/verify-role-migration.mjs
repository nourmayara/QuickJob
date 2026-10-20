import { PrismaClient } from "@prisma/client";
import nextEnv from "@next/env";
import path from "node:path";
import assert from "node:assert/strict";
import fs from "node:fs";
nextEnv.loadEnvConfig(process.cwd());
if (process.argv.length !== 3 || !["--backup", "--verify"].includes(process.argv[2])) {
  console.error("Usage: node scripts/verify-role-migration.mjs --backup|--verify");
  process.exit(1);
}
const prisma = new PrismaClient();
try {
  if (process.argv.includes("--backup")) {
    const before = await prisma.$queryRawUnsafe('SELECT * FROM "User" ORDER BY id');
    fs.mkdirSync("prisma/backups",{recursive:true});
    // Do not silently overwrite the snapshot needed to verify the initial migration.
    if (fs.existsSync("prisma/backups/roles-before.json")) throw new Error("Un instantané existe déjà ; le conserver pour la vérification.");
    const backup = path.resolve("prisma/backups",`before-roles-${Date.now()}.db`).replaceAll("\\","/");
    await prisma.$executeRawUnsafe(`VACUUM INTO '${backup.replaceAll("'","''")}'`);
    fs.writeFileSync("prisma/backups/roles-before.json", JSON.stringify(before,(_key,value)=>typeof value === "bigint" ? {bigint:value.toString()} : value));
    console.log("Sauvegarde créée. Appliquer prisma migrate deploy, puis relancer avec --verify.");
  } else {
  const snapshot = JSON.parse(fs.readFileSync("prisma/backups/roles-before.json","utf8"),(_key,value)=>value && typeof value === "object" && "bigint" in value ? BigInt(value.bigint) : value);
  const after = await prisma.$queryRawUnsafe('SELECT * FROM "User" ORDER BY id');
  assert.equal(after.length,snapshot.length);
  for(let i=0;i<snapshot.length;i++) for(const key of Object.keys(snapshot[i])) {
    const expected = key === "role" ? ({WORKER:"TRAVAILLEUR",RECRUITER:"RECRUTEUR"}[snapshot[i][key]] ?? snapshot[i][key]) : snapshot[i][key];
    assert.deepEqual(after[i][key] instanceof Date ? after[i][key].toISOString() : after[i][key],expected,`Utilisateur ${i}, champ ${key}`);
  }
  assert.deepEqual(await prisma.$queryRawUnsafe("PRAGMA foreign_key_check"),[]);
  console.log(`Migration vérifiée : ${after.length} utilisateurs conservés, tous les champs préservés. Sauvegardes : prisma/backups/`);
  }
} finally { await prisma.$disconnect(); }
