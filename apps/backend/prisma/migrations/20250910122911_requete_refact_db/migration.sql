/*
  Warnings:

  - The primary key for the `DemarchesEngagees` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `requeteEntiteStateId` on the `DemarchesEngagees` table. All the data in the column will be lost.
  - You are about to drop the column `organizationUnit` on the `Entite` table. All the data in the column will be lost.
  - You are about to drop the column `requeteEntiteStateId` on the `MisEnCause` table. All the data in the column will be lost.
  - You are about to drop the column `number` on the `Requete` table. All the data in the column will be lost.
  - The primary key for the `RequeteEntite` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `createdAt` on the `RequeteEntite` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `RequeteEntite` table. All the data in the column will be lost.
  - You are about to drop the column `number` on the `RequeteEntite` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `RequeteEntite` table. All the data in the column will be lost.
  - You are about to drop the column `requeteStateNoteId` on the `UploadedFile` table. All the data in the column will be lost.
  - You are about to drop the column `firstName` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `lastName` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Declarant` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DematSocialMapping` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DescriptionFaits` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DescriptionFaitsConsequence` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DescriptionFaitsMaltraitanceType` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DescriptionFaitsMotif` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `InfoComplementaire` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LieuIncident` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RequeteState` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RequeteStateNote` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Victime` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[personneConcerneeId]` on the table `Adresse` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[lieuDeSurvenueId]` on the table `Adresse` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[label]` on the table `AgeEnum` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[label]` on the table `EntiteTypeEnum` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[personneConcerneeId]` on the table `Identite` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[label]` on the table `RoleEnum` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[label]` on the table `StatutEnum` will be added. If there are existing duplicate values, this will fail.
  - Made the column `label` on table `Adresse` required. This step will fail if there are existing NULL values in that column.
  - Made the column `numero` on table `Adresse` required. This step will fail if there are existing NULL values in that column.
  - Made the column `rue` on table `Adresse` required. This step will fail if there are existing NULL values in that column.
  - Made the column `codePostal` on table `Adresse` required. This step will fail if there are existing NULL values in that column.
  - Made the column `ville` on table `Adresse` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `RequeteId` to the `DemarchesEngagees` table without a default value. This is not possible if the table is not empty.
  - Made the column `autreOrganisation` on table `DemarchesEngagees` required. This step will fail if there are existing NULL values in that column.
  - Made the column `plainteDeposeLocation` on table `DemarchesEngagees` required. This step will fail if there are existing NULL values in that column.
  - Made the column `commentaire` on table `DemarchesEngagees` required. This step will fail if there are existing NULL values in that column.
  - Made the column `email` on table `Entite` required. This step will fail if there are existing NULL values in that column.
  - Made the column `emailDomain` on table `Entite` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `personneConcerneeId` to the `Identite` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Identite` table without a default value. This is not possible if the table is not empty.
  - Made the column `prenom` on table `Identite` required. This step will fail if there are existing NULL values in that column.
  - Made the column `nom` on table `Identite` required. This step will fail if there are existing NULL values in that column.
  - Made the column `telephone` on table `Identite` required. This step will fail if there are existing NULL values in that column.
  - Made the column `email` on table `Identite` required. This step will fail if there are existing NULL values in that column.
  - Made the column `commentaire` on table `Identite` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `situationId` to the `MisEnCause` table without a default value. This is not possible if the table is not empty.
  - Made the column `commentaire` on table `MisEnCause` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `receptionTypeId` to the `Requete` table without a default value. This is not possible if the table is not empty.
  - Added the required column `entiteId` to the `RequeteEntite` table without a default value. This is not possible if the table is not empty.
  - Made the column `requeteId` on table `RequeteEntite` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `nom` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `prenom` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Declarant" DROP CONSTRAINT "Declarant_adresseId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Declarant" DROP CONSTRAINT "Declarant_ageId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Declarant" DROP CONSTRAINT "Declarant_civiliteId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Declarant" DROP CONSTRAINT "Declarant_identiteId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Declarant" DROP CONSTRAINT "Declarant_lienVictimeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Declarant" DROP CONSTRAINT "Declarant_requeteEntiteStateId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DemarchesEngagees" DROP CONSTRAINT "DemarchesEngagees_requeteEntiteStateId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DescriptionFaits" DROP CONSTRAINT "DescriptionFaits_requeteEntiteStateId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DescriptionFaitsConsequence" DROP CONSTRAINT "DescriptionFaitsConsequence_consequenceId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DescriptionFaitsConsequence" DROP CONSTRAINT "DescriptionFaitsConsequence_faitsId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DescriptionFaitsMaltraitanceType" DROP CONSTRAINT "DescriptionFaitsMaltraitanceType_faitsId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DescriptionFaitsMaltraitanceType" DROP CONSTRAINT "DescriptionFaitsMaltraitanceType_maltraitanceTypeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DescriptionFaitsMotif" DROP CONSTRAINT "DescriptionFaitsMotif_faitsId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DescriptionFaitsMotif" DROP CONSTRAINT "DescriptionFaitsMotif_motifId_fkey";

-- DropForeignKey
ALTER TABLE "public"."InfoComplementaire" DROP CONSTRAINT "InfoComplementaire_receptionTypeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."InfoComplementaire" DROP CONSTRAINT "InfoComplementaire_requeteEntiteStateId_fkey";

-- DropForeignKey
ALTER TABLE "public"."LieuIncident" DROP CONSTRAINT "LieuIncident_adresseId_fkey";

-- DropForeignKey
ALTER TABLE "public"."LieuIncident" DROP CONSTRAINT "LieuIncident_lieuTypeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."LieuIncident" DROP CONSTRAINT "LieuIncident_requeteEntiteStateId_fkey";

-- DropForeignKey
ALTER TABLE "public"."LieuIncident" DROP CONSTRAINT "LieuIncident_transportTypeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."MisEnCause" DROP CONSTRAINT "MisEnCause_requeteEntiteStateId_fkey";

-- DropForeignKey
ALTER TABLE "public"."RequeteEntite" DROP CONSTRAINT "RequeteEntite_requeteId_fkey";

-- DropForeignKey
ALTER TABLE "public"."RequeteState" DROP CONSTRAINT "RequeteState_requeteEntiteId_fkey";

-- DropForeignKey
ALTER TABLE "public"."RequeteState" DROP CONSTRAINT "RequeteState_statutId_fkey";

-- DropForeignKey
ALTER TABLE "public"."RequeteStateNote" DROP CONSTRAINT "RequeteStateNote_authorId_fkey";

-- DropForeignKey
ALTER TABLE "public"."RequeteStateNote" DROP CONSTRAINT "RequeteStateNote_requeteEntiteStateId_fkey";

-- DropForeignKey
ALTER TABLE "public"."UploadedFile" DROP CONSTRAINT "UploadedFile_requeteStateNoteId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Victime" DROP CONSTRAINT "Victime_adresseId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Victime" DROP CONSTRAINT "Victime_ageId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Victime" DROP CONSTRAINT "Victime_civiliteId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Victime" DROP CONSTRAINT "Victime_identiteId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Victime" DROP CONSTRAINT "Victime_requeteEntiteStateId_fkey";

-- AlterTable
ALTER TABLE "public"."Adresse" ADD COLUMN     "lieuDeSurvenueId" TEXT,
ADD COLUMN     "personneConcerneeId" TEXT,
ALTER COLUMN "label" SET NOT NULL,
ALTER COLUMN "label" SET DEFAULT '',
ALTER COLUMN "numero" SET NOT NULL,
ALTER COLUMN "numero" SET DEFAULT '',
ALTER COLUMN "rue" SET NOT NULL,
ALTER COLUMN "rue" SET DEFAULT '',
ALTER COLUMN "codePostal" SET NOT NULL,
ALTER COLUMN "codePostal" SET DEFAULT '',
ALTER COLUMN "ville" SET NOT NULL,
ALTER COLUMN "ville" SET DEFAULT '';

-- AlterTable
ALTER TABLE "public"."DemarchesEngagees" DROP CONSTRAINT "DemarchesEngagees_pkey",
DROP COLUMN "requeteEntiteStateId",
ADD COLUMN     "RequeteId" TEXT NOT NULL,
ALTER COLUMN "autreOrganisation" SET NOT NULL,
ALTER COLUMN "autreOrganisation" SET DEFAULT '',
ALTER COLUMN "plainteDeposeLocation" SET NOT NULL,
ALTER COLUMN "plainteDeposeLocation" SET DEFAULT '',
ALTER COLUMN "commentaire" SET NOT NULL,
ALTER COLUMN "commentaire" SET DEFAULT '',
ADD CONSTRAINT "DemarchesEngagees_pkey" PRIMARY KEY ("RequeteId");

-- AlterTable
ALTER TABLE "public"."Entite" DROP COLUMN "organizationUnit",
ADD COLUMN     "organizationalUnit" TEXT NOT NULL DEFAULT '',
ALTER COLUMN "email" SET NOT NULL,
ALTER COLUMN "email" SET DEFAULT '',
ALTER COLUMN "emailDomain" SET NOT NULL,
ALTER COLUMN "emailDomain" SET DEFAULT '';

-- AlterTable
ALTER TABLE "public"."Identite" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "personneConcerneeId" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "prenom" SET NOT NULL,
ALTER COLUMN "prenom" SET DEFAULT '',
ALTER COLUMN "nom" SET NOT NULL,
ALTER COLUMN "nom" SET DEFAULT '',
ALTER COLUMN "telephone" SET NOT NULL,
ALTER COLUMN "telephone" SET DEFAULT '',
ALTER COLUMN "email" SET NOT NULL,
ALTER COLUMN "email" SET DEFAULT '',
ALTER COLUMN "commentaire" SET NOT NULL,
ALTER COLUMN "commentaire" SET DEFAULT '';

-- AlterTable
ALTER TABLE "public"."MisEnCause" DROP COLUMN "requeteEntiteStateId",
ADD COLUMN     "situationId" TEXT NOT NULL,
ALTER COLUMN "commentaire" SET NOT NULL,
ALTER COLUMN "commentaire" SET DEFAULT '';

-- AlterTable
ALTER TABLE "public"."Requete" DROP COLUMN "number",
ADD COLUMN     "commentaire" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "receptionDate" TIMESTAMP(3),
ADD COLUMN     "receptionTypeId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."RequeteEntite" DROP CONSTRAINT "RequeteEntite_pkey",
DROP COLUMN "createdAt",
DROP COLUMN "id",
DROP COLUMN "number",
DROP COLUMN "updatedAt",
ADD COLUMN     "entiteId" TEXT NOT NULL,
ALTER COLUMN "requeteId" SET NOT NULL,
ADD CONSTRAINT "RequeteEntite_pkey" PRIMARY KEY ("requeteId", "entiteId");

-- AlterTable
ALTER TABLE "public"."UploadedFile" DROP COLUMN "requeteStateNoteId",
ADD COLUMN     "faitSituationId" TEXT,
ADD COLUMN     "requeteEtapeNoteId" TEXT,
ADD COLUMN     "requeteId" TEXT;

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "firstName",
DROP COLUMN "lastName",
ADD COLUMN     "nom" TEXT NOT NULL,
ADD COLUMN     "prenom" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- DropTable
DROP TABLE "public"."Declarant";

-- DropTable
DROP TABLE "public"."DematSocialMapping";

-- DropTable
DROP TABLE "public"."DescriptionFaits";

-- DropTable
DROP TABLE "public"."DescriptionFaitsConsequence";

-- DropTable
DROP TABLE "public"."DescriptionFaitsMaltraitanceType";

-- DropTable
DROP TABLE "public"."DescriptionFaitsMotif";

-- DropTable
DROP TABLE "public"."InfoComplementaire";

-- DropTable
DROP TABLE "public"."LieuIncident";

-- DropTable
DROP TABLE "public"."RequeteState";

-- DropTable
DROP TABLE "public"."RequeteStateNote";

-- DropTable
DROP TABLE "public"."Victime";

-- CreateTable
CREATE TABLE "public"."PersonneConcernee" (
    "id" TEXT NOT NULL,
    "estNonIdentifiee" BOOLEAN,
    "estAnonyme" BOOLEAN,
    "estHandicapee" BOOLEAN,
    "estIdentifie" BOOLEAN,
    "estVictime" BOOLEAN,
    "estVictimeInformee" BOOLEAN,
    "victimeInformeeCommentaire" TEXT NOT NULL DEFAULT '',
    "veutGarderAnonymat" BOOLEAN,
    "commentaire" TEXT NOT NULL DEFAULT '',
    "autrePersonnes" TEXT NOT NULL DEFAULT '',
    "ageId" TEXT,
    "civiliteId" TEXT,
    "lienVictimeId" TEXT,
    "declarantDeId" TEXT,
    "participantDeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonneConcernee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Situation" (
    "id" TEXT NOT NULL,
    "lieuDeSurvenueId" TEXT NOT NULL,
    "requeteId" TEXT,

    CONSTRAINT "Situation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LieuDeSurvenue" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL DEFAULT '',
    "codePostal" TEXT NOT NULL DEFAULT '',
    "societeTransport" TEXT NOT NULL DEFAULT '',
    "finess" TEXT NOT NULL DEFAULT '',
    "commentaire" TEXT NOT NULL DEFAULT '',
    "lieuTypeId" TEXT,
    "transportTypeId" TEXT,

    CONSTRAINT "LieuDeSurvenue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Fait" (
    "situationId" TEXT NOT NULL,
    "estMaltraitance" BOOLEAN,
    "dateDebut" TIMESTAMP(3),
    "dateFin" TIMESTAMP(3),
    "commentaire" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Fait_pkey" PRIMARY KEY ("situationId")
);

-- CreateTable
CREATE TABLE "public"."FaitMotif" (
    "situationId" TEXT NOT NULL,
    "motifId" TEXT NOT NULL,

    CONSTRAINT "FaitMotif_pkey" PRIMARY KEY ("situationId","motifId")
);

-- CreateTable
CREATE TABLE "public"."FaitConsequence" (
    "situationId" TEXT NOT NULL,
    "consequenceId" TEXT NOT NULL,

    CONSTRAINT "FaitConsequence_pkey" PRIMARY KEY ("situationId","consequenceId")
);

-- CreateTable
CREATE TABLE "public"."FaitMaltraitanceType" (
    "situationId" TEXT NOT NULL,
    "maltraitanceTypeId" TEXT NOT NULL,

    CONSTRAINT "FaitMaltraitanceType_pkey" PRIMARY KEY ("situationId","maltraitanceTypeId")
);

-- CreateTable
CREATE TABLE "public"."RequeteEtape" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "estPartagee" BOOLEAN NOT NULL DEFAULT false,
    "statutId" TEXT NOT NULL,
    "requeteId" TEXT NOT NULL,
    "entiteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequeteEtape_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RequeteEtapeNote" (
    "id" TEXT NOT NULL,
    "texte" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "requeteEtapeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequeteEtapeNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PersonneConcernee_declarantDeId_key" ON "public"."PersonneConcernee"("declarantDeId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonneConcernee_participantDeId_key" ON "public"."PersonneConcernee"("participantDeId");

-- CreateIndex
CREATE UNIQUE INDEX "Situation_lieuDeSurvenueId_key" ON "public"."Situation"("lieuDeSurvenueId");

-- CreateIndex
CREATE INDEX "RequeteEtape_requeteId_entiteId_createdAt_idx" ON "public"."RequeteEtape"("requeteId", "entiteId", "createdAt");

-- CreateIndex
CREATE INDEX "RequeteEtape_requeteId_entiteId_idx" ON "public"."RequeteEtape"("requeteId", "entiteId");

-- CreateIndex
CREATE UNIQUE INDEX "Adresse_personneConcerneeId_key" ON "public"."Adresse"("personneConcerneeId");

-- CreateIndex
CREATE UNIQUE INDEX "Adresse_lieuDeSurvenueId_key" ON "public"."Adresse"("lieuDeSurvenueId");

-- CreateIndex
CREATE UNIQUE INDEX "AgeEnum_label_key" ON "public"."AgeEnum"("label");

-- CreateIndex
CREATE UNIQUE INDEX "EntiteTypeEnum_label_key" ON "public"."EntiteTypeEnum"("label");

-- CreateIndex
CREATE UNIQUE INDEX "Identite_personneConcerneeId_key" ON "public"."Identite"("personneConcerneeId");

-- CreateIndex
CREATE UNIQUE INDEX "RoleEnum_label_key" ON "public"."RoleEnum"("label");

-- CreateIndex
CREATE UNIQUE INDEX "StatutEnum_label_key" ON "public"."StatutEnum"("label");

-- CreateIndex
CREATE INDEX "UploadedFile_entiteId_idx" ON "public"."UploadedFile"("entiteId");

-- AddForeignKey
ALTER TABLE "public"."Requete" ADD CONSTRAINT "Requete_receptionTypeId_fkey" FOREIGN KEY ("receptionTypeId") REFERENCES "public"."ReceptionTypeEnum"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RequeteEntite" ADD CONSTRAINT "RequeteEntite_requeteId_fkey" FOREIGN KEY ("requeteId") REFERENCES "public"."Requete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RequeteEntite" ADD CONSTRAINT "RequeteEntite_entiteId_fkey" FOREIGN KEY ("entiteId") REFERENCES "public"."Entite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DemarchesEngagees" ADD CONSTRAINT "DemarchesEngagees_RequeteId_fkey" FOREIGN KEY ("RequeteId") REFERENCES "public"."Requete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PersonneConcernee" ADD CONSTRAINT "PersonneConcernee_ageId_fkey" FOREIGN KEY ("ageId") REFERENCES "public"."AgeEnum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PersonneConcernee" ADD CONSTRAINT "PersonneConcernee_civiliteId_fkey" FOREIGN KEY ("civiliteId") REFERENCES "public"."CiviliteEnum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PersonneConcernee" ADD CONSTRAINT "PersonneConcernee_lienVictimeId_fkey" FOREIGN KEY ("lienVictimeId") REFERENCES "public"."LienVictimeEnum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PersonneConcernee" ADD CONSTRAINT "PersonneConcernee_declarantDeId_fkey" FOREIGN KEY ("declarantDeId") REFERENCES "public"."Requete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PersonneConcernee" ADD CONSTRAINT "PersonneConcernee_participantDeId_fkey" FOREIGN KEY ("participantDeId") REFERENCES "public"."Requete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Identite" ADD CONSTRAINT "Identite_personneConcerneeId_fkey" FOREIGN KEY ("personneConcerneeId") REFERENCES "public"."PersonneConcernee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Adresse" ADD CONSTRAINT "Adresse_personneConcerneeId_fkey" FOREIGN KEY ("personneConcerneeId") REFERENCES "public"."PersonneConcernee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Adresse" ADD CONSTRAINT "Adresse_lieuDeSurvenueId_fkey" FOREIGN KEY ("lieuDeSurvenueId") REFERENCES "public"."LieuDeSurvenue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Situation" ADD CONSTRAINT "Situation_lieuDeSurvenueId_fkey" FOREIGN KEY ("lieuDeSurvenueId") REFERENCES "public"."LieuDeSurvenue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Situation" ADD CONSTRAINT "Situation_requeteId_fkey" FOREIGN KEY ("requeteId") REFERENCES "public"."Requete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LieuDeSurvenue" ADD CONSTRAINT "LieuDeSurvenue_lieuTypeId_fkey" FOREIGN KEY ("lieuTypeId") REFERENCES "public"."LieuTypeEnum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LieuDeSurvenue" ADD CONSTRAINT "LieuDeSurvenue_transportTypeId_fkey" FOREIGN KEY ("transportTypeId") REFERENCES "public"."TransportTypeEnum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MisEnCause" ADD CONSTRAINT "MisEnCause_situationId_fkey" FOREIGN KEY ("situationId") REFERENCES "public"."Situation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Fait" ADD CONSTRAINT "Fait_situationId_fkey" FOREIGN KEY ("situationId") REFERENCES "public"."Situation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FaitMotif" ADD CONSTRAINT "FaitMotif_situationId_fkey" FOREIGN KEY ("situationId") REFERENCES "public"."Fait"("situationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FaitMotif" ADD CONSTRAINT "FaitMotif_motifId_fkey" FOREIGN KEY ("motifId") REFERENCES "public"."MotifEnum"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FaitConsequence" ADD CONSTRAINT "FaitConsequence_situationId_fkey" FOREIGN KEY ("situationId") REFERENCES "public"."Fait"("situationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FaitConsequence" ADD CONSTRAINT "FaitConsequence_consequenceId_fkey" FOREIGN KEY ("consequenceId") REFERENCES "public"."ConsequenceEnum"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FaitMaltraitanceType" ADD CONSTRAINT "FaitMaltraitanceType_situationId_fkey" FOREIGN KEY ("situationId") REFERENCES "public"."Fait"("situationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FaitMaltraitanceType" ADD CONSTRAINT "FaitMaltraitanceType_maltraitanceTypeId_fkey" FOREIGN KEY ("maltraitanceTypeId") REFERENCES "public"."MaltraitanceTypeEnum"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RequeteEtape" ADD CONSTRAINT "RequeteEtape_statutId_fkey" FOREIGN KEY ("statutId") REFERENCES "public"."RequeteStatutEnum"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RequeteEtape" ADD CONSTRAINT "RequeteEtape_requeteId_fkey" FOREIGN KEY ("requeteId") REFERENCES "public"."Requete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RequeteEtape" ADD CONSTRAINT "RequeteEtape_requeteId_entiteId_fkey" FOREIGN KEY ("requeteId", "entiteId") REFERENCES "public"."RequeteEntite"("requeteId", "entiteId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RequeteEtapeNote" ADD CONSTRAINT "RequeteEtapeNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RequeteEtapeNote" ADD CONSTRAINT "RequeteEtapeNote_requeteEtapeId_fkey" FOREIGN KEY ("requeteEtapeId") REFERENCES "public"."RequeteEtape"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UploadedFile" ADD CONSTRAINT "UploadedFile_requeteEtapeNoteId_fkey" FOREIGN KEY ("requeteEtapeNoteId") REFERENCES "public"."RequeteEtapeNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UploadedFile" ADD CONSTRAINT "UploadedFile_requeteId_fkey" FOREIGN KEY ("requeteId") REFERENCES "public"."Requete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UploadedFile" ADD CONSTRAINT "UploadedFile_faitSituationId_fkey" FOREIGN KEY ("faitSituationId") REFERENCES "public"."Fait"("situationId") ON DELETE CASCADE ON UPDATE CASCADE;
