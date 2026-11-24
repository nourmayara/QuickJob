CREATE TABLE "Engagement" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "applicationId" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'AWAITING_CONTRACTS',
  "currency" TEXT NOT NULL DEFAULT 'TND',
  "workerMillimes" INTEGER NOT NULL,
  "commissionBps" INTEGER NOT NULL,
  "commissionMillimes" INTEGER NOT NULL,
  "totalMillimes" INTEGER NOT NULL,
  "startAt" DATETIME NOT NULL,
  "endAt" DATETIME NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "confirmedAt" DATETIME,
  FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Engagement_applicationId_key" ON "Engagement" ("applicationId");

CREATE TABLE "EngagementContract" (
  "reference" TEXT NOT NULL PRIMARY KEY,
  "engagementId" INTEGER NOT NULL,
  "party" TEXT NOT NULL CHECK ("party" IN ('RECRUTEUR', 'TRAVAILLEUR')),
  "content" TEXT NOT NULL,
  "acceptedAt" DATETIME,
  FOREIGN KEY ("engagementId") REFERENCES "Engagement" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "EngagementContract_engagementId_party_key" ON "EngagementContract" ("engagementId", "party");
