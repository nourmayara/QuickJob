ALTER TABLE "Engagement" ADD COLUMN "completedAt" DATETIME;
ALTER TABLE "Engagement" ADD COLUMN "validationDueAt" DATETIME;
ALTER TABLE "Engagement" ADD COLUMN "validatedAt" DATETIME;
ALTER TABLE "Engagement" ADD COLUMN "paymentDueAt" DATETIME;
ALTER TABLE "Engagement" ADD COLUMN "validationReminderAt" DATETIME;
ALTER TABLE "Engagement" ADD COLUMN "paymentReminderAt" DATETIME;
CREATE INDEX "Engagement_status_paymentDueAt_idx" ON "Engagement" ("status", "paymentDueAt");

CREATE TABLE "EngagementDispute" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "engagementId" INTEGER NOT NULL REFERENCES "Engagement" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "openedById" INTEGER NOT NULL REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "reason" TEXT NOT NULL,
  "previousStatus" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" DATETIME,
  "resolvedById" INTEGER REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "decision" TEXT,
  "resolution" TEXT
);
CREATE UNIQUE INDEX "EngagementDispute_open" ON "EngagementDispute" ("engagementId") WHERE "resolvedAt" IS NULL;
