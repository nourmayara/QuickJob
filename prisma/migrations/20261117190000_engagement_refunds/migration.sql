ALTER TABLE "SimulatedPayout" ADD COLUMN "reversedAt" DATETIME;
CREATE TABLE "EngagementRefund" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "paymentId" TEXT NOT NULL REFERENCES "EngagementPayment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "adminId" INTEGER NOT NULL REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "reason" TEXT NOT NULL,
  "stripeRefundId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'REQUESTED',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" DATETIME
);
CREATE UNIQUE INDEX "EngagementRefund_paymentId_key" ON "EngagementRefund" ("paymentId");
CREATE UNIQUE INDEX "EngagementRefund_stripeRefundId_key" ON "EngagementRefund" ("stripeRefundId");
