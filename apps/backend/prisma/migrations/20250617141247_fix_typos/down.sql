-- DropForeignKey
ALTER TABLE "DescriptionFaitsMaltraitanceType" DROP CONSTRAINT "DescriptionFaitsMaltraitanceType_maltraitanceTypeId_fkey";

-- AlterTable
ALTER TABLE "Victime" DROP COLUMN "estHandicapee",
DROP COLUMN "estInformee",
ADD COLUMN     "estHandicape" BOOLEAN,
ADD COLUMN     "estInforme" BOOLEAN;

-- AlterTable
ALTER TABLE "Declarant" DROP COLUMN "estIdentifie",
ADD COLUMN     "estIdentife" BOOLEAN;

-- AlterTable
ALTER TABLE "DescriptionFaits" DROP COLUMN "dateDebut",
ADD COLUMN     "DateDebut" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "DescriptionFaitsMaltraitanceType" DROP CONSTRAINT "DescriptionFaitsMaltraitanceType_pkey",
DROP COLUMN "maltraitanceTypeId",
ADD COLUMN     "MaltraitanceTypeId" TEXT NOT NULL,
ADD CONSTRAINT "DescriptionFaitsMaltraitanceType_pkey" PRIMARY KEY ("faitsId", "MaltraitanceTypeId");

-- AlterTable
ALTER TABLE "DemarchesEngagees" DROP COLUMN "commentaire",
DROP COLUMN "estDemarcheEngagee",
ADD COLUMN     "comment" TEXT,
ADD COLUMN     "estDemarcheEngage" BOOLEAN;

-- AlterTable
ALTER TABLE "InfoComplementaire" DROP COLUMN "commentaire",
ADD COLUMN     "comments" TEXT;

-- AddForeignKey
ALTER TABLE "DescriptionFaitsMaltraitanceType" ADD CONSTRAINT "DescriptionFaitsMaltraitanceType_MaltraitanceTypeId_fkey" FOREIGN KEY ("MaltraitanceTypeId") REFERENCES "MaltraitanceTypeEnum"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

