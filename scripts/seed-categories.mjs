import { PrismaClient } from "@prisma/client";
import env from "@next/env";
env.loadEnvConfig(process.cwd());
const db = new PrismaClient();
const key = name => name.normalize("NFKD").replace(/\p{M}/gu, "").trim().replace(/\s+/g, " ").toLocaleLowerCase("fr");
try {
  const categories = await db.mission.groupBy({ by: ["category"] });
  for (const { category } of categories) if (category?.trim()) await db.category.upsert({ where: { key: key(category) }, update: {}, create: { name: category.trim().replace(/\s+/g, " "), key: key(category) } });
  console.log("Catégories existantes importées sans modifier les missions.");
} finally { await db.$disconnect(); }
