-- Rollback script for the functional ID migration
-- This will restore the database to its previous state ; content will be lost

ALTER TABLE "Requete" ADD COLUMN IF NOT EXISTS "number" SERIAL;
