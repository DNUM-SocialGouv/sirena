/*
  Warnings:

  - You are about to drop the column `estDemarcheEngagee` on the `DemarchesEngagees` table. All the data in the column will be lost.
  - You are about to drop the column `lieu` on the `LieuIncident` table. All the data in the column will be lost.
  - You are about to drop the column `natureLieuId` on the `LieuIncident` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `MisEnCause` table. All the data in the column will be lost.
  - You are about to drop the `NatureLieuEnum` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "LieuIncident" DROP CONSTRAINT "LieuIncident_natureLieuId_fkey";

-- AlterTable
ALTER TABLE "DemarchesEngagees" DROP COLUMN "estDemarcheEngagee";

-- AlterTable
ALTER TABLE "LieuIncident" DROP COLUMN "lieu",
DROP COLUMN "natureLieuId",
ADD COLUMN     "adresse" TEXT,
ADD COLUMN     "codePostal" TEXT,
ADD COLUMN     "societeTransport" TEXT;

-- AlterTable
ALTER TABLE "MisEnCause" DROP COLUMN "type",
ADD COLUMN     "misEnCauseTypeEnumId" TEXT,
ADD COLUMN     "professionDomicileTypeEnumId" TEXT;

-- DropTable
DROP TABLE "NatureLieuEnum";

-- CreateTable
CREATE TABLE "MisEnCauseTypeEnum" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "MisEnCauseTypeEnum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfessionDomicileTypeEnum" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "ProfessionDomicileTypeEnum_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MisEnCauseTypeEnum_label_key" ON "MisEnCauseTypeEnum"("label");

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionDomicileTypeEnum_label_key" ON "ProfessionDomicileTypeEnum"("label");

-- AddForeignKey
ALTER TABLE "MisEnCause" ADD CONSTRAINT "MisEnCause_misEnCauseTypeEnumId_fkey" FOREIGN KEY ("misEnCauseTypeEnumId") REFERENCES "MisEnCauseTypeEnum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MisEnCause" ADD CONSTRAINT "MisEnCause_professionDomicileTypeEnumId_fkey" FOREIGN KEY ("professionDomicileTypeEnumId") REFERENCES "ProfessionDomicileTypeEnum"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Custom
TRUNCATE TABLE "CiviliteEnum" CASCADE;