-- Add only nullable columns; preserve all existing accounts and applications.
ALTER TABLE "User" ADD COLUMN "experience" TEXT;
ALTER TABLE "User" ADD COLUMN "languages" TEXT;
ALTER TABLE "Application" ADD COLUMN "message" TEXT;
