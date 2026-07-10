/*
  Warnings:

  - A unique constraint covering the columns `[misEnCauseId]` on the table `Situation` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[demarchesEngageesId]` on the table `Situation` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Situation_misEnCauseId_key" ON "Situation"("misEnCauseId");

-- CreateIndex
CREATE UNIQUE INDEX "Situation_demarchesEngageesId_key" ON "Situation"("demarchesEngageesId");
