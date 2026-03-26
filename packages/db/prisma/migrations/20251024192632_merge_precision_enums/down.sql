-- Rollback migration: Restore the 4 separate precision enum tables

-- Step 1: Drop foreign key from MisEnCauseTypePrecisionEnum to MisEnCauseTypeEnum
ALTER TABLE "MisEnCauseTypePrecisionEnum" DROP CONSTRAINT IF EXISTS "MisEnCauseTypePrecisionEnum_misEnCauseTypeId_fkey";

-- Step 2: Drop foreign key constraint from MisEnCause
ALTER TABLE "MisEnCause" DROP CONSTRAINT IF EXISTS "MisEnCause_misEnCauseTypePrecisionId_fkey";

-- Step 3: Recreate old tables
CREATE TABLE "ProfessionTypeEnum" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    CONSTRAINT "ProfessionTypeEnum_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProfessionTypeEnum_label_key" ON "ProfessionTypeEnum"("label");

CREATE TABLE "ProfessionSocialTypeEnum" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    CONSTRAINT "ProfessionSocialTypeEnum_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProfessionSocialTypeEnum_label_key" ON "ProfessionSocialTypeEnum"("label");

CREATE TABLE "AutreProfessionnelTypeEnum" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    CONSTRAINT "AutreProfessionnelTypeEnum_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AutreProfessionnelTypeEnum_label_key" ON "AutreProfessionnelTypeEnum"("label");

CREATE TABLE "ProfessionDomicileTypeEnum" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    CONSTRAINT "ProfessionDomicileTypeEnum_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProfessionDomicileTypeEnum_label_key" ON "ProfessionDomicileTypeEnum"("label");

-- Step 4: Migrate data back from unified table to ProfessionTypeEnum (PROFESSIONNEL_SANTE)
INSERT INTO "ProfessionTypeEnum" ("id", "label")
SELECT id, label
FROM "MisEnCauseTypePrecisionEnum"
WHERE "misEnCauseTypeId" = (SELECT id FROM "MisEnCauseTypeEnum" WHERE label = 'Professionnel de santé');

-- Step 5: Migrate data back to ProfessionSocialTypeEnum (PROFESSIONNEL_SOCIAL)
INSERT INTO "ProfessionSocialTypeEnum" ("id", "label")
SELECT id, label
FROM "MisEnCauseTypePrecisionEnum"
WHERE "misEnCauseTypeId" = (SELECT id FROM "MisEnCauseTypeEnum" WHERE label = 'Professionnel social');

-- Step 6: Migrate data back to AutreProfessionnelTypeEnum (AUTRE_PROFESSIONNEL)
INSERT INTO "AutreProfessionnelTypeEnum" ("id", "label")
SELECT id, label
FROM "MisEnCauseTypePrecisionEnum"
WHERE "misEnCauseTypeId" = (SELECT id FROM "MisEnCauseTypeEnum" WHERE label = 'Autre professionnel');

-- Step 7: Migrate data back to ProfessionDomicileTypeEnum
INSERT INTO "ProfessionDomicileTypeEnum" ("id", "label")
SELECT id, label
FROM "MisEnCauseTypePrecisionEnum"
WHERE "misEnCauseTypeId" = (SELECT id FROM "MisEnCauseTypeEnum" WHERE label = 'Professionnel de santé')
ON CONFLICT ("id") DO NOTHING;

-- Step 8: Rename the column back in MisEnCause table
ALTER TABLE "MisEnCause" RENAME COLUMN "misEnCauseTypePrecisionId" TO "misEnCausePrecisionTypeId";

-- Step 9: Recreate old foreign key constraints
ALTER TABLE "MisEnCause" ADD CONSTRAINT "MisEnCause_misEnCausePrecisionTypeId_fkey_sante"
    FOREIGN KEY ("misEnCausePrecisionTypeId")
    REFERENCES "ProfessionTypeEnum"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;

ALTER TABLE "MisEnCause" ADD CONSTRAINT "MisEnCause_misEnCausePrecisionTypeId_fkey_social"
    FOREIGN KEY ("misEnCausePrecisionTypeId")
    REFERENCES "ProfessionSocialTypeEnum"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;

ALTER TABLE "MisEnCause" ADD CONSTRAINT "MisEnCause_misEnCausePrecisionTypeId_fkey_domicile"
    FOREIGN KEY ("misEnCausePrecisionTypeId")
    REFERENCES "ProfessionDomicileTypeEnum"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;

ALTER TABLE "MisEnCause" ADD CONSTRAINT "MisEnCause_misEnCausePrecisionTypeId_fkey_autre"
    FOREIGN KEY ("misEnCausePrecisionTypeId")
    REFERENCES "AutreProfessionnelTypeEnum"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;

-- Step 10: Drop the unified table and its index
DROP INDEX IF EXISTS "MisEnCauseTypePrecisionEnum_label_key";
DROP TABLE "MisEnCauseTypePrecisionEnum";
