-- Rollback Refactor Motif System
-- This rollback script reverses all changes made in migration.sql

-- Step 1: Drop foreign key constraints
ALTER TABLE "FaitMotifDeclaratif" DROP CONSTRAINT IF EXISTS "FaitMotifDeclaratif_motifDeclaratifId_fkey";
ALTER TABLE "FaitMotifDeclaratif" DROP CONSTRAINT IF EXISTS "FaitMotifDeclaratif_situationId_fkey";

-- Step 2: Drop FaitMotifDeclaratif table
DROP TABLE IF EXISTS "FaitMotifDeclaratif";

-- Step 3: Drop MotifDeclaratifEnum table
DROP TABLE IF EXISTS "MotifDeclaratifEnum";

-- Step 4: Restore default for MotifEnum.id (uuid generation)
ALTER TABLE "MotifEnum" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();

-- Step 5: Re-create unique constraint on label
CREATE UNIQUE INDEX IF NOT EXISTS "MotifEnum_label_key" ON "MotifEnum"("label");
