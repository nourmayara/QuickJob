-- Existing free-form profile fields are preserved for backward compatibility.
ALTER TABLE "User" ADD COLUMN "recommendationOptIn" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Mission" ADD COLUMN "requiredExperienceMonths" INTEGER;

CREATE TABLE "Skill" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "aliases" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "WorkerSkill" (
    "workerId" INTEGER NOT NULL,
    "skillId" INTEGER NOT NULL,
    "level" INTEGER,
    "yearsOfExperience" REAL,
    "source" TEXT NOT NULL DEFAULT 'PROFILE',
    "verifiedAt" DATETIME,
    PRIMARY KEY ("workerId", "skillId"),
    CONSTRAINT "WorkerSkill_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkerSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "MissionSkill" (
    "missionId" INTEGER NOT NULL,
    "skillId" INTEGER NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "weight" REAL NOT NULL DEFAULT 1,
    PRIMARY KEY ("missionId", "skillId"),
    CONSTRAINT "MissionSkill_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MissionSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "WorkExperience" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "workerId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "city" TEXT,
    "startedAt" DATETIME NOT NULL,
    "endedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkExperience_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "WorkerCategoryPreference" (
    "workerId" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    PRIMARY KEY ("workerId", "category"),
    CONSTRAINT "WorkerCategoryPreference_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "MatchRecommendation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "workerId" INTEGER NOT NULL,
    "missionId" INTEGER NOT NULL,
    "score" INTEGER NOT NULL CHECK ("score" BETWEEN 0 AND 100),
    "explanation" TEXT NOT NULL,
    "criteriaVersion" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    CONSTRAINT "MatchRecommendation_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MatchRecommendation_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Skill_key_key" ON "Skill"("key");
CREATE INDEX "WorkerSkill_skillId_idx" ON "WorkerSkill"("skillId");
CREATE INDEX "MissionSkill_skillId_idx" ON "MissionSkill"("skillId");
CREATE INDEX "WorkExperience_workerId_startedAt_idx" ON "WorkExperience"("workerId", "startedAt");
CREATE INDEX "WorkerCategoryPreference_category_idx" ON "WorkerCategoryPreference"("category");
CREATE UNIQUE INDEX "MatchRecommendation_workerId_missionId_key" ON "MatchRecommendation"("workerId", "missionId");
CREATE INDEX "MatchRecommendation_missionId_score_idx" ON "MatchRecommendation"("missionId", "score");
CREATE INDEX "MatchRecommendation_workerId_score_idx" ON "MatchRecommendation"("workerId", "score");
