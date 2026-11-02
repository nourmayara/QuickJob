ALTER TABLE "Application" ADD COLUMN "cancelledBy" TEXT;
ALTER TABLE "Application" ADD COLUMN "cancelledAt" DATETIME;
ALTER TABLE "Application" ADD COLUMN "cancelledFromStatus" TEXT;

CREATE TABLE "ReplacementOffer" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "missionId" INTEGER NOT NULL,
  "cancelledApplicationId" INTEGER NOT NULL,
  "applicationId" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdApplication" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" DATETIME NOT NULL,
  "respondedAt" DATETIME,
  CONSTRAINT "ReplacementOffer_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ReplacementOffer_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ReplacementOffer_applicationId_key" ON "ReplacementOffer"("applicationId");
CREATE INDEX "ReplacementOffer_cancelledApplicationId_status_idx" ON "ReplacementOffer"("cancelledApplicationId", "status");
CREATE INDEX "ReplacementOffer_missionId_status_idx" ON "ReplacementOffer"("missionId", "status");
