/*
  Warnings:

  - Added the required column `sortOrder` to the `RequetePrioriteEnum` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RequetePrioriteEnum" ADD COLUMN     "sortOrder" INTEGER NOT NULL;
