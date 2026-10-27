-- Additive transition: existing accounts, roles, suspensions, sessions and business data are unchanged.
CREATE TABLE "RecruiterVerification" (
 "userId" INTEGER NOT NULL PRIMARY KEY,
 "status" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
 "requestedAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
 "decidedAt" DATETIME,
 "decidedById" INTEGER,
 "refusalReason" TEXT,
 "legacy" BOOLEAN NOT NULL DEFAULT false,
 CONSTRAINT "RecruiterVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "RecruiterVerification_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "RecruiterVerification_status_requestedAt_idx" ON "RecruiterVerification"("status", "requestedAt");
-- Explicit grandfathering: preserve existing recruiter access without fabricating an admin decision.
INSERT INTO "RecruiterVerification" ("userId", "status", "requestedAt", "legacy")
 SELECT "id", 'APPROUVE', NULL, true FROM "User" WHERE "role" = 'RECRUTEUR';
CREATE TABLE "Notification" (
 "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
 "userId" INTEGER NOT NULL,
 "message" TEXT NOT NULL,
 "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "verificationId" INTEGER,
 CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "Notification_verificationId_fkey" FOREIGN KEY ("verificationId") REFERENCES "RecruiterVerification" ("userId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Notification_verificationId_key" ON "Notification"("verificationId");
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
