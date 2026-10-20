-- Additive migration: existing missions and accounts are preserved.
ALTER TABLE "User" ADD COLUMN "sector" TEXT;
ALTER TABLE "User" ADD COLUMN "bio" TEXT;
ALTER TABLE "User" ADD COLUMN "avatarUrl" TEXT;
ALTER TABLE "User" ADD COLUMN "skills" TEXT;
ALTER TABLE "Mission" ADD COLUMN "category" TEXT;
ALTER TABLE "Mission" ADD COLUMN "city" TEXT;
ALTER TABLE "Mission" ADD COLUMN "address" TEXT;
ALTER TABLE "Mission" ADD COLUMN "date" DATETIME;
ALTER TABLE "Mission" ADD COLUMN "startTime" TEXT;
ALTER TABLE "Mission" ADD COLUMN "endTime" TEXT;
ALTER TABLE "Mission" ADD COLUMN "pay" REAL;
ALTER TABLE "Mission" ADD COLUMN "capacity" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Mission" ADD COLUMN "skills" TEXT;
ALTER TABLE "Mission" ADD COLUMN "experience" TEXT;
-- Keep previously selected workers within the capacity of legacy missions.
UPDATE "Mission" SET "capacity" = MAX(1, (SELECT COUNT(*) FROM "Application" WHERE "missionId" = "Mission"."id" AND "status" = 'ACCEPTED'));
