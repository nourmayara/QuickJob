-- Add query indexes only; preserve all existing records and relations.
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");
CREATE INDEX "Mission_recruiterId_status_date_idx" ON "Mission"("recruiterId", "status", "date");
CREATE INDEX "Application_workerId_status_idx" ON "Application"("workerId", "status");
CREATE INDEX "Application_missionId_status_idx" ON "Application"("missionId", "status");
