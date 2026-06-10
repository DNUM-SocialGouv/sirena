/*
  Warnings:

  - A unique constraint covering the columns `[sirecId]` on the table `Requete` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Requete" ADD COLUMN     "sirecId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Requete_sirecId_key" ON "Requete"("sirecId");
