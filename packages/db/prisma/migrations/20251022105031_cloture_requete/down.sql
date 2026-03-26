-- DropForeignKey
ALTER TABLE "public"."RequeteEtape" DROP CONSTRAINT "RequeteEtape_clotureReasonId_fkey";

-- AlterTable
ALTER TABLE "public"."RequeteEtape" DROP COLUMN "clotureReasonId";

-- DropTable
DROP TABLE "public"."RequeteClotureReasonEnum";

