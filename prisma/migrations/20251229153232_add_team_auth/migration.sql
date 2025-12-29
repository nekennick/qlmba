-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "teamId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Dispatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dispatchNumber" TEXT,
    "fileUrl" TEXT,
    "type" TEXT NOT NULL,
    "documentType" TEXT NOT NULL DEFAULT 'CV',
    "isCBM" BOOLEAN NOT NULL DEFAULT false,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transactionDate" DATETIME,
    "linkedCvId" TEXT,
    "sourceDispatchId" TEXT,
    "teamId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Dispatch_linkedCvId_fkey" FOREIGN KEY ("linkedCvId") REFERENCES "Dispatch" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Dispatch_sourceDispatchId_fkey" FOREIGN KEY ("sourceDispatchId") REFERENCES "Dispatch" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Dispatch_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Dispatch" ("createdAt", "date", "dispatchNumber", "documentType", "fileUrl", "id", "linkedCvId", "type", "updatedAt") SELECT "createdAt", "date", "dispatchNumber", "documentType", "fileUrl", "id", "linkedCvId", "type", "updatedAt" FROM "Dispatch";
DROP TABLE "Dispatch";
ALTER TABLE "new_Dispatch" RENAME TO "Dispatch";
CREATE TABLE "new_Transformer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serialNumber" TEXT NOT NULL,
    "capacity" TEXT,
    "model" TEXT,
    "note" TEXT,
    "testResult" TEXT,
    "isProcessed" BOOLEAN NOT NULL DEFAULT false,
    "imageUrl" TEXT,
    "dispatchId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Transformer_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "Dispatch" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Transformer" ("capacity", "createdAt", "dispatchId", "id", "model", "note", "serialNumber", "updatedAt") SELECT "capacity", "createdAt", "dispatchId", "id", "model", "note", "serialNumber", "updatedAt" FROM "Transformer";
DROP TABLE "Transformer";
ALTER TABLE "new_Transformer" RENAME TO "Transformer";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Team_code_key" ON "Team"("code");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
