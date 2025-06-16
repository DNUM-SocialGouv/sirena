-- DropForeignKey
ALTER TABLE "RequeteEntite" DROP CONSTRAINT "RequeteEntite_requeteId_fkey";

-- DropForeignKey
ALTER TABLE "RequeteState" DROP CONSTRAINT "RequeteState_requeteEntiteId_fkey";

-- DropForeignKey
ALTER TABLE "RequeteState" DROP CONSTRAINT "RequeteState_statutId_fkey";

-- DropForeignKey
ALTER TABLE "Victime" DROP CONSTRAINT "Victime_requeteEntiteStateId_fkey";

-- DropForeignKey
ALTER TABLE "Victime" DROP CONSTRAINT "Victime_identiteId_fkey";

-- DropForeignKey
ALTER TABLE "Victime" DROP CONSTRAINT "Victime_adresseId_fkey";

-- DropForeignKey
ALTER TABLE "Victime" DROP CONSTRAINT "Victime_ageId_fkey";

-- DropForeignKey
ALTER TABLE "Victime" DROP CONSTRAINT "Victime_civiliteId_fkey";

-- DropForeignKey
ALTER TABLE "Declarant" DROP CONSTRAINT "Declarant_requeteEntiteStateId_fkey";

-- DropForeignKey
ALTER TABLE "Declarant" DROP CONSTRAINT "Declarant_identiteId_fkey";

-- DropForeignKey
ALTER TABLE "Declarant" DROP CONSTRAINT "Declarant_adresseId_fkey";

-- DropForeignKey
ALTER TABLE "Declarant" DROP CONSTRAINT "Declarant_lienVictimeId_fkey";

-- DropForeignKey
ALTER TABLE "Declarant" DROP CONSTRAINT "Declarant_civiliteId_fkey";

-- DropForeignKey
ALTER TABLE "DescriptionFaits" DROP CONSTRAINT "DescriptionFaits_requeteEntiteStateId_fkey";

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
ALTER TABLE "LieuIncident" DROP CONSTRAINT "LieuIncident_lieuTypeId_fkey";

-- DropForeignKey
ALTER TABLE "LieuIncident" DROP CONSTRAINT "LieuIncident_natureLieuId_fkey";

-- DropForeignKey
ALTER TABLE "LieuIncident" DROP CONSTRAINT "LieuIncident_serviceDomicileId_fkey";

-- DropForeignKey
ALTER TABLE "LieuIncident" DROP CONSTRAINT "LieuIncident_transportTypeId_fkey";

-- DropForeignKey
ALTER TABLE "LieuIncident" DROP CONSTRAINT "LieuIncident_requeteEntiteStateId_fkey";

-- DropForeignKey
ALTER TABLE "MisEnCause" DROP CONSTRAINT "MisEnCause_professionTypeId_fkey";

-- DropForeignKey
ALTER TABLE "MisEnCause" DROP CONSTRAINT "MisEnCause_requeteEntiteStateId_fkey";

-- DropForeignKey
ALTER TABLE "DemarchesEngagees" DROP CONSTRAINT "DemarchesEngagees_requeteEntiteStateId_fkey";

-- DropForeignKey
ALTER TABLE "InfoComplementaire" DROP CONSTRAINT "InfoComplementaire_receptionTypeId_fkey";

-- DropForeignKey
ALTER TABLE "InfoComplementaire" DROP CONSTRAINT "InfoComplementaire_requeteEntiteStateId_fkey";

-- DropTable
DROP TABLE "Requete";

-- DropTable
DROP TABLE "RequeteEntite";

-- DropTable
DROP TABLE "RequeteStatutEnum";

-- DropTable
DROP TABLE "RequeteState";

-- DropTable
DROP TABLE "Identite";

-- DropTable
DROP TABLE "Victime";

-- DropTable
DROP TABLE "AgeEnum";

-- DropTable
DROP TABLE "Declarant";

-- DropTable
DROP TABLE "CiviliteEnum";

-- DropTable
DROP TABLE "LienVictimeEnum";

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
DROP TABLE "LieuIncident";

-- DropTable
DROP TABLE "NatureLieuEnum";

-- DropTable
DROP TABLE "LieuTypeEnum";

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
DROP TABLE "InfoComplementaire";

-- DropTable
DROP TABLE "ReceptionTypeEnum";

