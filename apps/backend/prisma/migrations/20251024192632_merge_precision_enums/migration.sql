-- Step 1: Create new unified enum table
CREATE TABLE "MisEnCauseTypePrecisionEnum" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "misEnCauseTypeId" TEXT NOT NULL,

    CONSTRAINT "MisEnCauseTypePrecisionEnum_pkey" PRIMARY KEY ("id")
);

-- Step 2: Create unique index
CREATE UNIQUE INDEX "MisEnCauseTypePrecisionEnum_label_key" ON "MisEnCauseTypePrecisionEnum"("label");

-- Step 3: Migrate data from ProfessionTypeEnum (PROFESSIONNEL_SANTE)
-- Only migrate if the table exists
INSERT INTO "MisEnCauseTypePrecisionEnum" ("id", "label", "misEnCauseTypeId")
SELECT
    pt.id,
    pt.label,
    (SELECT id FROM "MisEnCauseTypeEnum" WHERE label = 'Professionnel de santé')
FROM "ProfessionTypeEnum" pt
WHERE EXISTS (SELECT 1 FROM "ProfessionTypeEnum" LIMIT 1);

-- Step 4: Migrate data from ProfessionDomicileTypeEnum (PROFESSIONNEL_SANTE)
-- Only migrate if the table exists
INSERT INTO "MisEnCauseTypePrecisionEnum" ("id", "label", "misEnCauseTypeId")
SELECT
    pd.id,
    pd.label,
    (SELECT id FROM "MisEnCauseTypeEnum" WHERE label = 'Professionnel de santé')
FROM "ProfessionDomicileTypeEnum" pd
WHERE EXISTS (SELECT 1 FROM "ProfessionDomicileTypeEnum" LIMIT 1);

-- Step 5: Add new unified column to MisEnCause table
ALTER TABLE "MisEnCause" ADD COLUMN "misEnCauseTypePrecisionId" TEXT;

-- Step 6: Migrate data from old columns to new unified column
UPDATE "MisEnCause"
SET "misEnCauseTypePrecisionId" = "professionTypeId"
WHERE "professionTypeId" IS NOT NULL;

UPDATE "MisEnCause"
SET "misEnCauseTypePrecisionId" = "professionDomicileTypeId"
WHERE "professionDomicileTypeId" IS NOT NULL AND "professionTypeId" IS NULL;

-- Step 7: Drop old foreign key constraints
ALTER TABLE "MisEnCause" DROP CONSTRAINT IF EXISTS "MisEnCause_professionTypeId_fkey";
ALTER TABLE "MisEnCause" DROP CONSTRAINT IF EXISTS "MisEnCause_professionDomicileTypeId_fkey";

-- Step 8: Drop old columns
ALTER TABLE "MisEnCause" DROP COLUMN IF EXISTS "professionTypeId";
ALTER TABLE "MisEnCause" DROP COLUMN IF EXISTS "professionDomicileTypeId";

-- Step 9: Add new foreign key constraint
ALTER TABLE "MisEnCause" ADD CONSTRAINT "MisEnCause_misEnCauseTypePrecisionId_fkey"
    FOREIGN KEY ("misEnCauseTypePrecisionId")
    REFERENCES "MisEnCauseTypePrecisionEnum"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;

-- Step 10: Add foreign key from MisEnCauseTypePrecisionEnum to MisEnCauseTypeEnum
ALTER TABLE "MisEnCauseTypePrecisionEnum" ADD CONSTRAINT "MisEnCauseTypePrecisionEnum_misEnCauseTypeId_fkey"
    FOREIGN KEY ("misEnCauseTypeId")
    REFERENCES "MisEnCauseTypeEnum"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

-- Step 11: Drop old tables
DROP TABLE IF EXISTS "ProfessionTypeEnum";
DROP TABLE IF EXISTS "ProfessionDomicileTypeEnum";
