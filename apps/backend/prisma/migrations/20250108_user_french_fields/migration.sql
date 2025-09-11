-- Migration: User model field names from English to French
-- Description: Rename User fields firstName -> prenom, lastName -> nom, add updatedAt
-- Date: 2025-01-08

-- ======================================
-- STEP 1: Add new French columns
-- ======================================

-- Add new French field names to User table (as nullable first)
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "prenom" TEXT,
  ADD COLUMN IF NOT EXISTS "nom" TEXT,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ======================================
-- STEP 2: Copy data from English to French columns
-- ======================================

-- Copy existing data from English fields to French fields
UPDATE "User"
SET
  "prenom" = "firstName",
  "nom" = "lastName"
WHERE "prenom" IS NULL OR "nom" IS NULL;

-- ======================================
-- STEP 3: Make French columns required
-- ======================================

-- Make French fields required (after data is copied)
ALTER TABLE "User"
  ALTER COLUMN "prenom" SET NOT NULL,
  ALTER COLUMN "nom" SET NOT NULL;

-- ======================================
-- STEP 4: Drop old English columns
-- ======================================

-- Drop the old English field names
ALTER TABLE "User"
  DROP COLUMN IF EXISTS "firstName",
  DROP COLUMN IF EXISTS "lastName";
