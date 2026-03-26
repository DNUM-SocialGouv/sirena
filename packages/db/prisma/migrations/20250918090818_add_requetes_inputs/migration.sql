/*
  Warnings:

  - The primary key for the `DemarchesEngagees` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `RequeteId` on the `DemarchesEngagees` table. All the data in the column will be lost.
  - You are about to drop the column `aContacte` on the `DemarchesEngagees` table. All the data in the column will be lost.
  - You are about to drop the column `aContacteAutre` on the `DemarchesEngagees` table. All the data in the column will be lost.
  - You are about to drop the column `aDeposePlainte` on the `DemarchesEngagees` table. All the data in the column will be lost.
  - You are about to drop the column `aRepondu` on the `DemarchesEngagees` table. All the data in the column will be lost.
  - You are about to drop the column `autreOrganisation` on the `DemarchesEngagees` table. All the data in the column will be lost.
  - You are about to drop the column `dateContact` on the `DemarchesEngagees` table. All the data in the column will be lost.
  - You are about to drop the column `plainteDeposeDate` on the `DemarchesEngagees` table. All the data in the column will be lost.
  - You are about to drop the column `plainteDeposeLocation` on the `DemarchesEngagees` table. All the data in the column will be lost.
  - You are about to drop the column `estMaltraitance` on the `Fait` table. All the data in the column will be lost.
  - You are about to drop the column `nom` on the `LieuDeSurvenue` table. All the data in the column will be lost.
  - You are about to drop the column `estIdentifie` on the `MisEnCause` table. All the data in the column will be lost.
  - You are about to drop the column `identite` on the `MisEnCause` table. All the data in the column will be lost.
  - You are about to drop the column `situationId` on the `MisEnCause` table. All the data in the column will be lost.
  - The required column `id` was added to the `DemarchesEngagees` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `demarchesEngageesId` to the `Situation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `misEnCauseId` to the `Situation` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."DemarchesEngagees" DROP CONSTRAINT "DemarchesEngagees_RequeteId_fkey";

-- DropForeignKey
ALTER TABLE "public"."MisEnCause" DROP CONSTRAINT "MisEnCause_situationId_fkey";

-- AlterTable
ALTER TABLE "public"."DemarchesEngagees" DROP CONSTRAINT "DemarchesEngagees_pkey",
DROP COLUMN "RequeteId",
DROP COLUMN "aContacte",
DROP COLUMN "aContacteAutre",
DROP COLUMN "aDeposePlainte",
DROP COLUMN "aRepondu",
DROP COLUMN "autreOrganisation",
DROP COLUMN "dateContact",
DROP COLUMN "plainteDeposeDate",
DROP COLUMN "plainteDeposeLocation",
ADD COLUMN     "autoriteTypeId" TEXT,
ADD COLUMN     "dateContactEtablissement" TIMESTAMP(3),
ADD COLUMN     "datePlainte" TIMESTAMP(3),
ADD COLUMN     "etablissementARepondu" BOOLEAN,
ADD COLUMN     "id" TEXT NOT NULL,
ADD COLUMN     "organisme" TEXT NOT NULL DEFAULT '',
ADD CONSTRAINT "DemarchesEngagees_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."Fait" DROP COLUMN "estMaltraitance";

-- AlterTable
ALTER TABLE "public"."LieuDeSurvenue" DROP COLUMN "nom";

-- AlterTable
ALTER TABLE "public"."MisEnCause" DROP COLUMN "estIdentifie",
DROP COLUMN "identite",
DROP COLUMN "situationId";

-- AlterTable
ALTER TABLE "public"."PersonneConcernee" ADD COLUMN     "telephone" TEXT DEFAULT '';

-- AlterTable
ALTER TABLE "public"."Situation" ADD COLUMN     "demarchesEngageesId" TEXT NOT NULL,
ADD COLUMN     "misEnCauseId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "public"."AutoriteTypeEnum" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "AutoriteTypeEnum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DemarchesEngageesEnum" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "DemarchesEngageesEnum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_DemarchesEngageesToDemarchesEngageesEnum" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DemarchesEngageesToDemarchesEngageesEnum_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "AutoriteTypeEnum_label_key" ON "public"."AutoriteTypeEnum"("label");

-- CreateIndex
CREATE UNIQUE INDEX "DemarchesEngageesEnum_label_key" ON "public"."DemarchesEngageesEnum"("label");

-- CreateIndex
CREATE INDEX "_DemarchesEngageesToDemarchesEngageesEnum_B_index" ON "public"."_DemarchesEngageesToDemarchesEngageesEnum"("B");

-- AddForeignKey
ALTER TABLE "public"."DemarchesEngagees" ADD CONSTRAINT "DemarchesEngagees_autoriteTypeId_fkey" FOREIGN KEY ("autoriteTypeId") REFERENCES "public"."AutoriteTypeEnum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Situation" ADD CONSTRAINT "Situation_misEnCauseId_fkey" FOREIGN KEY ("misEnCauseId") REFERENCES "public"."MisEnCause"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Situation" ADD CONSTRAINT "Situation_demarchesEngageesId_fkey" FOREIGN KEY ("demarchesEngageesId") REFERENCES "public"."DemarchesEngagees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_DemarchesEngageesToDemarchesEngageesEnum" ADD CONSTRAINT "_DemarchesEngageesToDemarchesEngageesEnum_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."DemarchesEngagees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_DemarchesEngageesToDemarchesEngageesEnum" ADD CONSTRAINT "_DemarchesEngageesToDemarchesEngageesEnum_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."DemarchesEngageesEnum"("id") ON DELETE CASCADE ON UPDATE CASCADE;
