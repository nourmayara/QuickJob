ALTER TABLE "Notification" ADD COLUMN "readAt" DATETIME;
CREATE TABLE "Message" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "applicationId" INTEGER NOT NULL,
  "senderId" INTEGER NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" DATETIME,
  CONSTRAINT "Message_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Message_applicationId_id_idx" ON "Message"("applicationId", "id");
CREATE TABLE "Review" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "missionId" INTEGER NOT NULL,
  "authorId" INTEGER NOT NULL,
  "recipientId" INTEGER NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Review_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Review_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Review_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Review_authorId_recipientId_missionId_key" ON "Review"("authorId", "recipientId", "missionId");
CREATE INDEX "Review_recipientId_idx" ON "Review"("recipientId");
