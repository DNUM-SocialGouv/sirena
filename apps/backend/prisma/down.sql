-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_roleId_fkey";

-- DropForeignKey
ALTER TABLE "Dossier" DROP CONSTRAINT "Dossier_statutId_fkey";

-- DropForeignKey
ALTER TABLE "Requete" DROP CONSTRAINT "Requete_dossierId_fkey";

-- DropForeignKey
ALTER TABLE "Requete" DROP CONSTRAINT "Requete_statutId_fkey";

-- DropForeignKey
ALTER TABLE "PersonneConcernee" DROP CONSTRAINT "PersonneConcernee_requeteId_fkey";

-- DropForeignKey
ALTER TABLE "PersonneConcernee" DROP CONSTRAINT "PersonneConcernee_personneId_fkey";

-- DropForeignKey
ALTER TABLE "PersonneConcernee" DROP CONSTRAINT "PersonneConcernee_adresseId_fkey";

-- DropForeignKey
ALTER TABLE "PersonneConcernee" DROP CONSTRAINT "PersonneConcernee_ageId_fkey";

-- DropForeignKey
ALTER TABLE "PersonneConcernee" DROP CONSTRAINT "PersonneConcernee_civiliteId_fkey";

-- DropForeignKey
ALTER TABLE "Declarant" DROP CONSTRAINT "Declarant_requeteId_fkey";

-- DropForeignKey
ALTER TABLE "Declarant" DROP CONSTRAINT "Declarant_personneId_fkey";

-- DropForeignKey
ALTER TABLE "Declarant" DROP CONSTRAINT "Declarant_adresseId_fkey";

-- DropForeignKey
ALTER TABLE "Declarant" DROP CONSTRAINT "Declarant_LienPersonneConcerneeId_fkey";

-- DropForeignKey
ALTER TABLE "Declarant" DROP CONSTRAINT "Declarant_civiliteId_fkey";

-- DropForeignKey
ALTER TABLE "DescriptionFaits" DROP CONSTRAINT "DescriptionFaits_requeteId_fkey";

-- DropForeignKey
ALTER TABLE "DescriptionFaitsMotif" DROP CONSTRAINT "DescriptionFaitsMotif_faitsId_fkey";

-- DropForeignKey
ALTER TABLE "DescriptionFaitsMotif" DROP CONSTRAINT "DescriptionFaitsMotif_motifId_fkey";

-- DropForeignKey
ALTER TABLE "DescriptionFaitsConsequence" DROP CONSTRAINT "DescriptionFaitsConsequence_faitsId_fkey";

-- DropForeignKey
ALTER TABLE "DescriptionFaitsConsequence" DROP CONSTRAINT "DescriptionFaitsConsequence_consequenceId_fkey";

-- DropForeignKey
ALTER TABLE "DescriptionFaitsMaltraitanceType" DROP CONSTRAINT "DescriptionFaitsMaltraitanceType_faitsId_fkey";

-- DropForeignKey
ALTER TABLE "DescriptionFaitsMaltraitanceType" DROP CONSTRAINT "DescriptionFaitsMaltraitanceType_MaltraitanceTypeId_fkey";

-- DropForeignKey
ALTER TABLE "lieuIncident" DROP CONSTRAINT "lieuIncident_natureLieuId_fkey";

-- DropForeignKey
ALTER TABLE "lieuIncident" DROP CONSTRAINT "lieuIncident_serviceDomicileId_fkey";

-- DropForeignKey
ALTER TABLE "lieuIncident" DROP CONSTRAINT "lieuIncident_transportTypeId_fkey";

-- DropForeignKey
ALTER TABLE "lieuIncident" DROP CONSTRAINT "lieuIncident_requeteId_fkey";

-- DropForeignKey
ALTER TABLE "MisEnCause" DROP CONSTRAINT "MisEnCause_professionTypeId_fkey";

-- DropForeignKey
ALTER TABLE "MisEnCause" DROP CONSTRAINT "MisEnCause_requeteId_fkey";

-- DropForeignKey
ALTER TABLE "DemarchesEngagees" DROP CONSTRAINT "DemarchesEngagees_requeteId_fkey";

-- DropForeignKey
ALTER TABLE "infoComplementaire" DROP CONSTRAINT "infoComplementaire_receptionTypeId_fkey";

-- DropForeignKey
ALTER TABLE "infoComplementaire" DROP CONSTRAINT "infoComplementaire_requeteId_fkey";

-- DropTable
DROP TABLE "RoleEnum";

-- DropTable
DROP TABLE "Dossier";

-- DropTable
DROP TABLE "RequeteStatutEnum";

-- DropTable
DROP TABLE "Requete";

-- DropTable
DROP TABLE "Personne";

-- DropTable
DROP TABLE "PersonneConcernee";

-- DropTable
DROP TABLE "AgeEnum";

-- DropTable
DROP TABLE "Declarant";

-- DropTable
DROP TABLE "CiviliteEnum";

-- DropTable
DROP TABLE "LienPersonneConcerneeEnum";

-- DropTable
DROP TABLE "Adresse";

-- DropTable
DROP TABLE "DescriptionFaits";

-- DropTable
DROP TABLE "MotifEnum";

-- DropTable
DROP TABLE "ConsequenceEnum";

-- DropTable
DROP TABLE "MaltraitanceTypeEnum";

-- DropTable
DROP TABLE "DescriptionFaitsMotif";

-- DropTable
DROP TABLE "DescriptionFaitsConsequence";

-- DropTable
DROP TABLE "DescriptionFaitsMaltraitanceType";

-- DropTable
DROP TABLE "lieuIncident";

-- DropTable
DROP TABLE "NatureLieuEnum";

-- DropTable
DROP TABLE "ServiceDomicileEnum";

-- DropTable
DROP TABLE "TransportTypeEnum";

-- DropTable
DROP TABLE "MisEnCause";

-- DropTable
DROP TABLE "ProfessionTypeEnum";

-- DropTable
DROP TABLE "DemarchesEngagees";

-- DropTable
DROP TABLE "infoComplementaire";

-- DropTable
DROP TABLE "receptionTypeEnum";

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "roleName" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_roleName_key" ON "Role"("roleName" ASC);

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

