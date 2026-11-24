CREATE TABLE "EngagementPayment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "engagementId" INTEGER NOT NULL REFERENCES "Engagement" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "stripeIntentId" TEXT,
  "stripeAmount" INTEGER NOT NULL,
  "stripeCurrency" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paidAt" DATETIME
);
CREATE UNIQUE INDEX "EngagementPayment_engagementId_key" ON "EngagementPayment" ("engagementId");
CREATE UNIQUE INDEX "EngagementPayment_stripeIntentId_key" ON "EngagementPayment" ("stripeIntentId");
CREATE TABLE "SimulatedPayout" (
  "paymentId" TEXT NOT NULL PRIMARY KEY REFERENCES "EngagementPayment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "StripeWebhookEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "processedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
