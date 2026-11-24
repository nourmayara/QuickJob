CREATE TABLE "FinancialSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY DEFAULT 1 CHECK ("id" = 1),
    "commissionBps" INTEGER NOT NULL DEFAULT 2000 CHECK ("commissionBps" BETWEEN 0 AND 10000),
    "validationHours" INTEGER NOT NULL DEFAULT 48 CHECK ("validationHours" BETWEEN 1 AND 8760),
    "paymentHours" INTEGER NOT NULL DEFAULT 48 CHECK ("paymentHours" BETWEEN 1 AND 8760),
    "revision" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "CommissionRateHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "previousBps" INTEGER NOT NULL,
    "newBps" INTEGER NOT NULL,
    "adminId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommissionRateHistory_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT OR IGNORE INTO "FinancialSettings" ("id", "updatedAt") VALUES (1, CURRENT_TIMESTAMP);
