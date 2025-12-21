-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Dispatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dispatchNumber" TEXT,
    "fileUrl" TEXT,
    "type" TEXT NOT NULL,
    "documentType" TEXT NOT NULL DEFAULT 'CV',
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "linkedCvId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Dispatch_linkedCvId_fkey" FOREIGN KEY ("linkedCvId") REFERENCES "Dispatch" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Dispatch" ("createdAt", "date", "dispatchNumber", "fileUrl", "id", "type", "updatedAt") SELECT "createdAt", "date", "dispatchNumber", "fileUrl", "id", "type", "updatedAt" FROM "Dispatch";
DROP TABLE "Dispatch";
ALTER TABLE "new_Dispatch" RENAME TO "Dispatch";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
