CREATE TABLE "Availability" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "workerId" INTEGER NOT NULL,
  "startAt" DATETIME NOT NULL,
  "endAt" DATETIME NOT NULL,
  "kind" TEXT NOT NULL,
  "note" TEXT NOT NULL DEFAULT '',
  CONSTRAINT "Availability_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Availability_workerId_startAt_endAt_idx" ON "Availability"("workerId", "startAt", "endAt");
CREATE TABLE "Favorite" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "workerId" INTEGER NOT NULL,
  "missionId" INTEGER NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Favorite_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Favorite_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Favorite_workerId_missionId_key" ON "Favorite"("workerId", "missionId");
CREATE INDEX "Favorite_missionId_idx" ON "Favorite"("missionId");
