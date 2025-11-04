-- Refactor Motif System
-- This migration consolidates the following changes:
--   1. Remove unique constraint from MotifEnum.label
--   2. Remove default from MotifEnum.id (IDs are now explicit CAPS_WITH_UNDERSCORES)
--   3. Create separate MotifDeclaratifEnum table for declarative motifs
--   4. Create FaitMotifDeclaratif relation table

-- Step 1: Drop unique constraint on label
DROP INDEX IF EXISTS "MotifEnum_label_key";

-- Step 2: Remove default from id (IDs are now explicit CAPS_WITH_UNDERSCORES)
ALTER TABLE "MotifEnum" ALTER COLUMN "id" DROP DEFAULT;

-- Step 3: Create MotifDeclaratifEnum table for declarative motifs
CREATE TABLE IF NOT EXISTS "MotifDeclaratifEnum" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "MotifDeclaratifEnum_pkey" PRIMARY KEY ("id")
);

-- Step 4: Create FaitMotifDeclaratif relation table
CREATE TABLE IF NOT EXISTS "FaitMotifDeclaratif" (
    "situationId" TEXT NOT NULL,
    "motifDeclaratifId" TEXT NOT NULL,

    CONSTRAINT "FaitMotifDeclaratif_pkey" PRIMARY KEY ("situationId","motifDeclaratifId")
);

-- Step 5: Add foreign key constraints
ALTER TABLE "FaitMotifDeclaratif"
  DROP CONSTRAINT IF EXISTS "FaitMotifDeclaratif_situationId_fkey",
  ADD CONSTRAINT "FaitMotifDeclaratif_situationId_fkey"
  FOREIGN KEY ("situationId") REFERENCES "Fait"("situationId")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FaitMotifDeclaratif"
  DROP CONSTRAINT IF EXISTS "FaitMotifDeclaratif_motifDeclaratifId_fkey",
  ADD CONSTRAINT "FaitMotifDeclaratif_motifDeclaratifId_fkey"
  FOREIGN KEY ("motifDeclaratifId") REFERENCES "MotifDeclaratifEnum"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
