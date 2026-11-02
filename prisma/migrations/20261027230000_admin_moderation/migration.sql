-- Add moderation records and a category catalogue. Existing users, approvals,
-- missions and applications are not updated or deleted.
CREATE TABLE "Category" (
 "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
 "name" TEXT NOT NULL,
 "key" TEXT NOT NULL,
 "active" BOOLEAN NOT NULL DEFAULT true,
 "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "Category_key_key" ON "Category"("key");
INSERT INTO "Category" ("name", "key") VALUES
 ('Restauration','restauration'),('Événementiel','evenementiel'),('Commerce','commerce'),
 ('Logistique','logistique'),('Administration','administration'),('Services','services'),('Autre','autre');
CREATE TABLE "Report" (
 "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
 "kind" TEXT NOT NULL,
 "reason" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'NOUVEAU',
 "authorId" INTEGER,
 "targetUserId" INTEGER,
 "missionId" INTEGER,
 "moderatorId" INTEGER,
 "resolution" TEXT,
 "decidedAt" DATETIME,
 "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "Report_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
 CONSTRAINT "Report_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
 CONSTRAINT "Report_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
 CONSTRAINT "Report_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt");
CREATE INDEX "Report_authorId_idx" ON "Report"("authorId");
CREATE TABLE "AdminAction" (
 "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
 "adminId" INTEGER,
 "action" TEXT NOT NULL,
 "targetType" TEXT NOT NULL,
 "targetId" INTEGER NOT NULL,
 "reason" TEXT NOT NULL,
 "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "AdminAction_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "AdminAction_targetType_targetId_createdAt_idx" ON "AdminAction"("targetType", "targetId", "createdAt");
