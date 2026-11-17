-- Speed up unread notification counts while preserving the existing timeline index.
CREATE INDEX "Notification_userId_readAt_createdAt_idx"
ON "Notification"("userId", "readAt", "createdAt");
