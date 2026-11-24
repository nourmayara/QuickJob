-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
BEGIN;
CREATE TABLE "new_Message" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "applicationId" INTEGER NOT NULL,
    "senderId" INTEGER NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" DATETIME,
    CONSTRAINT "Message_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Message" ("applicationId", "body", "createdAt", "id", "readAt", "senderId") SELECT "applicationId", "body", "createdAt", "id", "readAt", "senderId" FROM "Message";
INSERT INTO sqlite_sequence (name, seq) SELECT 'new_Message', 0 WHERE NOT EXISTS (SELECT 1 FROM sqlite_sequence WHERE name = 'new_Message');
UPDATE sqlite_sequence SET seq = MAX(seq, COALESCE((SELECT seq FROM sqlite_sequence WHERE name = 'Message'), 0)) WHERE name = 'new_Message';
DROP TABLE "Message";
ALTER TABLE "new_Message" RENAME TO "Message";
CREATE INDEX "Message_applicationId_id_idx" ON "Message"("applicationId", "id");
COMMIT;
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

