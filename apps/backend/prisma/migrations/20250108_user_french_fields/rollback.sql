-- Rollback: User model field names from French back to English
-- Description: Rollback the rename of User fields prenom -> firstName, nom -> lastName
-- Date: 2025-01-08
-- WARNING: Make sure to backup your database before running this rollback!

-- ======================================
-- STEP 1: Add back English columns
-- ======================================

-- Add English field names back to User table (as nullable first)
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "firstName" TEXT,
  ADD COLUMN IF NOT EXISTS "lastName" TEXT;

-- ======================================
-- STEP 2: Copy data from French to English columns
-- ======================================

-- Copy data from French fields to English fields
UPDATE "User"
SET
  "firstName" = "prenom",
  "lastName" = "nom"
WHERE "firstName" IS NULL OR "lastName" IS NULL;

-- ======================================
-- STEP 3: Make English columns required
-- ======================================

-- Make English fields required (after data is copied)
ALTER TABLE "User"
  ALTER COLUMN "firstName" SET NOT NULL,
  ALTER COLUMN "lastName" SET NOT NULL;

-- ======================================
-- STEP 4: Drop French columns
-- ======================================

-- Drop the French field names and updatedAt
ALTER TABLE "User"
  DROP COLUMN IF EXISTS "prenom",
  DROP COLUMN IF EXISTS "nom",
  DROP COLUMN IF EXISTS "updatedAt";
