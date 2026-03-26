-- DropForeignKey
ALTER TABLE "public"."Requete" DROP CONSTRAINT "Requete_receptionTypeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."RequeteEntite" DROP CONSTRAINT "RequeteEntite_requeteId_fkey";

-- DropForeignKey
ALTER TABLE "public"."RequeteEntite" DROP CONSTRAINT "RequeteEntite_entiteId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DemarchesEngagees" DROP CONSTRAINT "DemarchesEngagees_RequeteId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PersonneConcernee" DROP CONSTRAINT "PersonneConcernee_ageId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PersonneConcernee" DROP CONSTRAINT "PersonneConcernee_civiliteId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PersonneConcernee" DROP CONSTRAINT "PersonneConcernee_lienVictimeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PersonneConcernee" DROP CONSTRAINT "PersonneConcernee_declarantDeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PersonneConcernee" DROP CONSTRAINT "PersonneConcernee_participantDeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Identite" DROP CONSTRAINT "Identite_personneConcerneeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Adresse" DROP CONSTRAINT "Adresse_personneConcerneeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Adresse" DROP CONSTRAINT "Adresse_lieuDeSurvenueId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Situation" DROP CONSTRAINT "Situation_lieuDeSurvenueId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Situation" DROP CONSTRAINT "Situation_requeteId_fkey";

-- DropForeignKey
ALTER TABLE "public"."LieuDeSurvenue" DROP CONSTRAINT "LieuDeSurvenue_lieuTypeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."LieuDeSurvenue" DROP CONSTRAINT "LieuDeSurvenue_transportTypeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."MisEnCause" DROP CONSTRAINT "MisEnCause_situationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Fait" DROP CONSTRAINT "Fait_situationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."FaitMotif" DROP CONSTRAINT "FaitMotif_situationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."FaitMotif" DROP CONSTRAINT "FaitMotif_motifId_fkey";

-- DropForeignKey
ALTER TABLE "public"."FaitConsequence" DROP CONSTRAINT "FaitConsequence_situationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."FaitConsequence" DROP CONSTRAINT "FaitConsequence_consequenceId_fkey";

-- DropForeignKey
ALTER TABLE "public"."FaitMaltraitanceType" DROP CONSTRAINT "FaitMaltraitanceType_situationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."FaitMaltraitanceType" DROP CONSTRAINT "FaitMaltraitanceType_maltraitanceTypeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."RequeteEtape" DROP CONSTRAINT "RequeteEtape_statutId_fkey";

-- DropForeignKey
ALTER TABLE "public"."RequeteEtape" DROP CONSTRAINT "RequeteEtape_requeteId_fkey";

-- DropForeignKey
ALTER TABLE "public"."RequeteEtape" DROP CONSTRAINT "RequeteEtape_requeteId_entiteId_fkey";

-- DropForeignKey
ALTER TABLE "public"."RequeteEtapeNote" DROP CONSTRAINT "RequeteEtapeNote_authorId_fkey";

-- DropForeignKey
ALTER TABLE "public"."RequeteEtapeNote" DROP CONSTRAINT "RequeteEtapeNote_requeteEtapeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."UploadedFile" DROP CONSTRAINT "UploadedFile_requeteEtapeNoteId_fkey";

-- DropForeignKey
ALTER TABLE "public"."UploadedFile" DROP CONSTRAINT "UploadedFile_requeteId_fkey";

-- DropForeignKey
ALTER TABLE "public"."UploadedFile" DROP CONSTRAINT "UploadedFile_faitSituationId_fkey";

-- DropIndex
DROP INDEX "public"."StatutEnum_label_key";

-- DropIndex
DROP INDEX "public"."EntiteTypeEnum_label_key";

-- DropIndex
DROP INDEX "public"."RoleEnum_label_key";

-- DropIndex
DROP INDEX "public"."AgeEnum_label_key";

-- DropIndex
DROP INDEX "public"."Identite_personneConcerneeId_key";

-- DropIndex
DROP INDEX "public"."Adresse_personneConcerneeId_key";

-- DropIndex
DROP INDEX "public"."Adresse_lieuDeSurvenueId_key";

-- DropIndex
DROP INDEX "public"."UploadedFile_entiteId_idx";

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "nom",
DROP COLUMN "prenom",
DROP COLUMN "updatedAt",
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "lastName" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."Entite" DROP COLUMN "organizationalUnit",
ADD COLUMN     "organizationUnit" TEXT,
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "email" DROP DEFAULT,
ALTER COLUMN "emailDomain" DROP NOT NULL,
ALTER COLUMN "emailDomain" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."Requete" DROP COLUMN "commentaire",
DROP COLUMN "receptionDate",
DROP COLUMN "receptionTypeId",
ADD COLUMN     "number" SERIAL NOT NULL;

-- AlterTable
ALTER TABLE "public"."RequeteEntite" DROP CONSTRAINT "RequeteEntite_pkey",
DROP COLUMN "entiteId",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "id" TEXT NOT NULL,
ADD COLUMN     "number" SERIAL NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "requeteId" DROP NOT NULL,
ADD CONSTRAINT "RequeteEntite_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."DemarchesEngagees" DROP CONSTRAINT "DemarchesEngagees_pkey",
DROP COLUMN "RequeteId",
ADD COLUMN     "requeteEntiteStateId" TEXT NOT NULL,
ALTER COLUMN "autreOrganisation" DROP NOT NULL,
ALTER COLUMN "autreOrganisation" DROP DEFAULT,
ALTER COLUMN "plainteDeposeLocation" DROP NOT NULL,
ALTER COLUMN "plainteDeposeLocation" DROP DEFAULT,
ALTER COLUMN "commentaire" DROP NOT NULL,
ALTER COLUMN "commentaire" DROP DEFAULT,
ADD CONSTRAINT "DemarchesEngagees_pkey" PRIMARY KEY ("requeteEntiteStateId");

-- AlterTable
ALTER TABLE "public"."Identite" DROP COLUMN "createdAt",
DROP COLUMN "personneConcerneeId",
DROP COLUMN "updatedAt",
ALTER COLUMN "prenom" DROP NOT NULL,
ALTER COLUMN "prenom" DROP DEFAULT,
ALTER COLUMN "nom" DROP NOT NULL,
ALTER COLUMN "nom" DROP DEFAULT,
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "email" DROP DEFAULT,
ALTER COLUMN "telephone" DROP NOT NULL,
ALTER COLUMN "telephone" DROP DEFAULT,
ALTER COLUMN "commentaire" DROP NOT NULL,
ALTER COLUMN "commentaire" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."Adresse" DROP COLUMN "lieuDeSurvenueId",
DROP COLUMN "personneConcerneeId",
ALTER COLUMN "label" DROP NOT NULL,
ALTER COLUMN "label" DROP DEFAULT,
ALTER COLUMN "numero" DROP NOT NULL,
ALTER COLUMN "numero" DROP DEFAULT,
ALTER COLUMN "rue" DROP NOT NULL,
ALTER COLUMN "rue" DROP DEFAULT,
ALTER COLUMN "codePostal" DROP NOT NULL,
ALTER COLUMN "codePostal" DROP DEFAULT,
ALTER COLUMN "ville" DROP NOT NULL,
ALTER COLUMN "ville" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."MisEnCause" DROP COLUMN "situationId",
ADD COLUMN     "requeteEntiteStateId" TEXT NOT NULL,
ALTER COLUMN "commentaire" DROP NOT NULL,
ALTER COLUMN "commentaire" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."UploadedFile" DROP COLUMN "faitSituationId",
DROP COLUMN "requeteEtapeNoteId",
DROP COLUMN "requeteId",
ADD COLUMN     "requeteStateNoteId" TEXT;

-- DropTable
DROP TABLE "public"."PersonneConcernee";

-- DropTable
DROP TABLE "public"."Situation";

-- DropTable
DROP TABLE "public"."LieuDeSurvenue";

-- DropTable
DROP TABLE "public"."Fait";

-- DropTable
DROP TABLE "public"."FaitMotif";

-- DropTable
DROP TABLE "public"."FaitConsequence";

-- DropTable
DROP TABLE "public"."FaitMaltraitanceType";

-- DropTable
DROP TABLE "public"."RequeteEtape";

-- DropTable
DROP TABLE "public"."RequeteEtapeNote";

-- CreateTable
CREATE TABLE "public"."Declarant" (
    "id" TEXT NOT NULL,
    "estIdentifie" BOOLEAN,
    "estVictime" BOOLEAN,
    "estVictimeInformee" BOOLEAN,
    "estAnonyme" BOOLEAN,
    "estHandicapee" BOOLEAN,
    "victimeInformeeCommentaire" TEXT,
    "veutGarderAnonymat" BOOLEAN,
    "commentaire" TEXT,
    "requeteEntiteStateId" TEXT NOT NULL,
    "identiteId" TEXT NOT NULL,
    "adresseId" TEXT,
    "ageId" TEXT,
    "lienVictimeId" TEXT,
    "civiliteId" TEXT,

    CONSTRAINT "Declarant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DematSocialMapping" (
    "id" TEXT NOT NULL,
    "dematSocialId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DematSocialMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DescriptionFaits" (
    "estMaltraitance" BOOLEAN,
    "dateDebut" TIMESTAMP(3),
    "dateFin" TIMESTAMP(3),
    "commentaire" TEXT,
    "requeteEntiteStateId" TEXT NOT NULL,

    CONSTRAINT "DescriptionFaits_pkey" PRIMARY KEY ("requeteEntiteStateId")
);

-- CreateTable
CREATE TABLE "public"."DescriptionFaitsConsequence" (
    "faitsId" TEXT NOT NULL,
    "consequenceId" TEXT NOT NULL,

    CONSTRAINT "DescriptionFaitsConsequence_pkey" PRIMARY KEY ("faitsId","consequenceId")
);

-- CreateTable
CREATE TABLE "public"."DescriptionFaitsMaltraitanceType" (
    "faitsId" TEXT NOT NULL,
    "maltraitanceTypeId" TEXT NOT NULL,

    CONSTRAINT "DescriptionFaitsMaltraitanceType_pkey" PRIMARY KEY ("faitsId","maltraitanceTypeId")
);

-- CreateTable
CREATE TABLE "public"."DescriptionFaitsMotif" (
    "faitsId" TEXT NOT NULL,
    "motifId" TEXT NOT NULL,

    CONSTRAINT "DescriptionFaitsMotif_pkey" PRIMARY KEY ("faitsId","motifId")
);

-- CreateTable
CREATE TABLE "public"."InfoComplementaire" (
    "requeteEntiteStateId" TEXT NOT NULL,
    "receptionDate" TIMESTAMP(3),
    "commentaire" TEXT,
    "receptionTypeId" TEXT,

    CONSTRAINT "InfoComplementaire_pkey" PRIMARY KEY ("requeteEntiteStateId")
);

-- CreateTable
CREATE TABLE "public"."LieuIncident" (
    "id" TEXT NOT NULL,
    "nom" TEXT,
    "codePostal" TEXT,
    "societeTransport" TEXT,
    "finess" TEXT,
    "commentaire" TEXT,
    "adresseId" TEXT,
    "lieuTypeId" TEXT,
    "transportTypeId" TEXT,
    "requeteEntiteStateId" TEXT NOT NULL,

    CONSTRAINT "LieuIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RequeteState" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "requeteEntiteId" TEXT NOT NULL,
    "statutId" TEXT NOT NULL,
    "stepName" TEXT,

    CONSTRAINT "RequeteState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RequeteStateNote" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "requeteEntiteStateId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,

    CONSTRAINT "RequeteStateNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Victime" (
    "id" TEXT NOT NULL,
    "estNonIdentifiee" BOOLEAN,
    "estAnonyme" BOOLEAN,
    "estHandicapee" BOOLEAN,
    "commentaire" TEXT,
    "requeteEntiteStateId" TEXT NOT NULL,
    "identiteId" TEXT NOT NULL,
    "adresseId" TEXT,
    "ageId" TEXT,
    "civiliteId" TEXT,

    CONSTRAINT "Victime_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Declarant_adresseId_key" ON "public"."Declarant"("adresseId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Declarant_identiteId_key" ON "public"."Declarant"("identiteId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Declarant_requeteEntiteStateId_key" ON "public"."Declarant"("requeteEntiteStateId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "DematSocialMapping_dematSocialId_key" ON "public"."DematSocialMapping"("dematSocialId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Victime_identiteId_key" ON "public"."Victime"("identiteId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Victime_requeteEntiteStateId_key" ON "public"."Victime"("requeteEntiteStateId" ASC);

-- AddForeignKey
ALTER TABLE "public"."Declarant" ADD CONSTRAINT "Declarant_adresseId_fkey" FOREIGN KEY ("adresseId") REFERENCES "public"."Adresse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Declarant" ADD CONSTRAINT "Declarant_ageId_fkey" FOREIGN KEY ("ageId") REFERENCES "public"."AgeEnum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Declarant" ADD CONSTRAINT "Declarant_civiliteId_fkey" FOREIGN KEY ("civiliteId") REFERENCES "public"."CiviliteEnum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Declarant" ADD CONSTRAINT "Declarant_identiteId_fkey" FOREIGN KEY ("identiteId") REFERENCES "public"."Identite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Declarant" ADD CONSTRAINT "Declarant_lienVictimeId_fkey" FOREIGN KEY ("lienVictimeId") REFERENCES "public"."LienVictimeEnum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Declarant" ADD CONSTRAINT "Declarant_requeteEntiteStateId_fkey" FOREIGN KEY ("requeteEntiteStateId") REFERENCES "public"."RequeteState"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DemarchesEngagees" ADD CONSTRAINT "DemarchesEngagees_requeteEntiteStateId_fkey" FOREIGN KEY ("requeteEntiteStateId") REFERENCES "public"."RequeteState"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DescriptionFaits" ADD CONSTRAINT "DescriptionFaits_requeteEntiteStateId_fkey" FOREIGN KEY ("requeteEntiteStateId") REFERENCES "public"."RequeteState"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DescriptionFaitsConsequence" ADD CONSTRAINT "DescriptionFaitsConsequence_consequenceId_fkey" FOREIGN KEY ("consequenceId") REFERENCES "public"."ConsequenceEnum"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DescriptionFaitsConsequence" ADD CONSTRAINT "DescriptionFaitsConsequence_faitsId_fkey" FOREIGN KEY ("faitsId") REFERENCES "public"."DescriptionFaits"("requeteEntiteStateId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DescriptionFaitsMaltraitanceType" ADD CONSTRAINT "DescriptionFaitsMaltraitanceType_faitsId_fkey" FOREIGN KEY ("faitsId") REFERENCES "public"."DescriptionFaits"("requeteEntiteStateId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DescriptionFaitsMaltraitanceType" ADD CONSTRAINT "DescriptionFaitsMaltraitanceType_maltraitanceTypeId_fkey" FOREIGN KEY ("maltraitanceTypeId") REFERENCES "public"."MaltraitanceTypeEnum"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DescriptionFaitsMotif" ADD CONSTRAINT "DescriptionFaitsMotif_faitsId_fkey" FOREIGN KEY ("faitsId") REFERENCES "public"."DescriptionFaits"("requeteEntiteStateId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DescriptionFaitsMotif" ADD CONSTRAINT "DescriptionFaitsMotif_motifId_fkey" FOREIGN KEY ("motifId") REFERENCES "public"."MotifEnum"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InfoComplementaire" ADD CONSTRAINT "InfoComplementaire_receptionTypeId_fkey" FOREIGN KEY ("receptionTypeId") REFERENCES "public"."ReceptionTypeEnum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InfoComplementaire" ADD CONSTRAINT "InfoComplementaire_requeteEntiteStateId_fkey" FOREIGN KEY ("requeteEntiteStateId") REFERENCES "public"."RequeteState"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LieuIncident" ADD CONSTRAINT "LieuIncident_adresseId_fkey" FOREIGN KEY ("adresseId") REFERENCES "public"."Adresse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LieuIncident" ADD CONSTRAINT "LieuIncident_lieuTypeId_fkey" FOREIGN KEY ("lieuTypeId") REFERENCES "public"."LieuTypeEnum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LieuIncident" ADD CONSTRAINT "LieuIncident_requeteEntiteStateId_fkey" FOREIGN KEY ("requeteEntiteStateId") REFERENCES "public"."RequeteState"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LieuIncident" ADD CONSTRAINT "LieuIncident_transportTypeId_fkey" FOREIGN KEY ("transportTypeId") REFERENCES "public"."TransportTypeEnum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MisEnCause" ADD CONSTRAINT "MisEnCause_requeteEntiteStateId_fkey" FOREIGN KEY ("requeteEntiteStateId") REFERENCES "public"."RequeteState"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RequeteEntite" ADD CONSTRAINT "RequeteEntite_requeteId_fkey" FOREIGN KEY ("requeteId") REFERENCES "public"."Requete"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RequeteState" ADD CONSTRAINT "RequeteState_requeteEntiteId_fkey" FOREIGN KEY ("requeteEntiteId") REFERENCES "public"."RequeteEntite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RequeteState" ADD CONSTRAINT "RequeteState_statutId_fkey" FOREIGN KEY ("statutId") REFERENCES "public"."RequeteStatutEnum"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RequeteStateNote" ADD CONSTRAINT "RequeteStateNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RequeteStateNote" ADD CONSTRAINT "RequeteStateNote_requeteEntiteStateId_fkey" FOREIGN KEY ("requeteEntiteStateId") REFERENCES "public"."RequeteState"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UploadedFile" ADD CONSTRAINT "UploadedFile_requeteStateNoteId_fkey" FOREIGN KEY ("requeteStateNoteId") REFERENCES "public"."RequeteStateNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Victime" ADD CONSTRAINT "Victime_adresseId_fkey" FOREIGN KEY ("adresseId") REFERENCES "public"."Adresse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Victime" ADD CONSTRAINT "Victime_ageId_fkey" FOREIGN KEY ("ageId") REFERENCES "public"."AgeEnum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Victime" ADD CONSTRAINT "Victime_civiliteId_fkey" FOREIGN KEY ("civiliteId") REFERENCES "public"."CiviliteEnum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Victime" ADD CONSTRAINT "Victime_identiteId_fkey" FOREIGN KEY ("identiteId") REFERENCES "public"."Identite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Victime" ADD CONSTRAINT "Victime_requeteEntiteStateId_fkey" FOREIGN KEY ("requeteEntiteStateId") REFERENCES "public"."RequeteState"("id") ON DELETE CASCADE ON UPDATE CASCADE;

