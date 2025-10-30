-- Rollback migration: Add back the active field to User table
ALTER TABLE "User" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT false;
