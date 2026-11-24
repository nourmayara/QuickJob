CREATE TABLE "StripePaymentReconciliation" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "adminId" INTEGER NOT NULL,
  "paymentId" TEXT NOT NULL,
  "stripeIntentId" TEXT,
  "outcome" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "StripePaymentReconciliation_paymentId_createdAt_idx"
ON "StripePaymentReconciliation" ("paymentId", "createdAt");
