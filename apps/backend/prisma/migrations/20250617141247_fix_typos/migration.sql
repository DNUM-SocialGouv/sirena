/*
  Warnings:

  - You are about to drop the column `estIdentife` on the `Declarant` table. All the data in the column will be lost.
  - You are about to drop the column `comment` on the `DemarchesEngagees` table. All the data in the column will be lost.
  - You are about to drop the column `estDemarcheEngage` on the `DemarchesEngagees` table. All the data in the column will be lost.
  - You are about to drop the column `DateDebut` on the `DescriptionFaits` table. All the data in the column will be lost.
  - The primary key for the `DescriptionFaitsMaltraitanceType` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `MaltraitanceTypeId` on the `DescriptionFaitsMaltraitanceType` table. All the data in the column will be lost.
  - You are about to drop the column `comments` on the `InfoComplementaire` table. All the data in the column will be lost.
  - You are about to drop the column `estHandicape` on the `Victime` table. All the data in the column will be lost.
  - You are about to drop the column `estInforme` on the `Victime` table. All the data in the column will be lost.
  - Added the required column `maltraitanceTypeId` to the `DescriptionFaitsMaltraitanceType` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "DescriptionFaitsMaltraitanceType" DROP CONSTRAINT "DescriptionFaitsMaltraitanceType_MaltraitanceTypeId_fkey";

-- AlterTable
ALTER TABLE "Declarant" DROP COLUMN "estIdentife",
ADD COLUMN     "estIdentifie" BOOLEAN;

-- AlterTable
ALTER TABLE "DemarchesEngagees" DROP COLUMN "comment",
DROP COLUMN "estDemarcheEngage",
ADD COLUMN     "commentaire" TEXT,
ADD COLUMN     "estDemarcheEngagee" BOOLEAN;

-- AlterTable
ALTER TABLE "DescriptionFaits" DROP COLUMN "DateDebut",
ADD COLUMN     "dateDebut" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "DescriptionFaitsMaltraitanceType" DROP CONSTRAINT "DescriptionFaitsMaltraitanceType_pkey",
DROP COLUMN "MaltraitanceTypeId",
ADD COLUMN     "maltraitanceTypeId" TEXT NOT NULL,
ADD CONSTRAINT "DescriptionFaitsMaltraitanceType_pkey" PRIMARY KEY ("faitsId", "maltraitanceTypeId");

-- AlterTable
ALTER TABLE "InfoComplementaire" DROP COLUMN "comments",
ADD COLUMN     "commentaire" TEXT;

-- AlterTable
ALTER TABLE "Victime" DROP COLUMN "estHandicape",
DROP COLUMN "estInforme",
ADD COLUMN     "estHandicapee" BOOLEAN,
ADD COLUMN     "estInformee" BOOLEAN;

-- AddForeignKey
ALTER TABLE "DescriptionFaitsMaltraitanceType" ADD CONSTRAINT "DescriptionFaitsMaltraitanceType_maltraitanceTypeId_fkey" FOREIGN KEY ("maltraitanceTypeId") REFERENCES "MaltraitanceTypeEnum"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
