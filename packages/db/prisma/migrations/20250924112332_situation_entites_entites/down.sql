-- DropForeignKey
ALTER TABLE "public"."SituationEntite" DROP CONSTRAINT "SituationEntite_situationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."SituationEntite" DROP CONSTRAINT "SituationEntite_entiteId_fkey";

-- DropTable
DROP TABLE "public"."SituationEntite";

