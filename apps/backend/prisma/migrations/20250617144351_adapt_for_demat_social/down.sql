-- DropForeignKey
ALTER TABLE "MisEnCause" DROP CONSTRAINT "MisEnCause_misEnCauseTypeEnumId_fkey";

-- DropForeignKey
ALTER TABLE "MisEnCause" DROP CONSTRAINT "MisEnCause_professionDomicileTypeEnumId_fkey";

-- AlterTable
ALTER TABLE "RequeteState" DROP COLUMN "commentaire";

-- AlterTable
ALTER TABLE "LieuIncident" DROP COLUMN "adresse",
DROP COLUMN "codePostal",
DROP COLUMN "societeTransport",
ADD COLUMN     "lieu" TEXT,
ADD COLUMN     "natureLieuId" TEXT;

-- AlterTable
ALTER TABLE "MisEnCause" DROP COLUMN "misEnCauseTypeEnumId",
DROP COLUMN "professionDomicileTypeEnumId",
ADD COLUMN     "type" TEXT;

-- AlterTable
ALTER TABLE "DemarchesEngagees" ADD COLUMN     "estDemarcheEngagee" BOOLEAN;

-- DropTable
DROP TABLE "MisEnCauseTypeEnum";

-- DropTable
DROP TABLE "ProfessionDomicileTypeEnum";

-- CreateTable
CREATE TABLE "NatureLieuEnum" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "NatureLieuEnum_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "LieuIncident" ADD CONSTRAINT "LieuIncident_natureLieuId_fkey" FOREIGN KEY ("natureLieuId") REFERENCES "NatureLieuEnum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

