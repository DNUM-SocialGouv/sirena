-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- DropForeignKey
ALTER TABLE "public"."InseePostal" DROP CONSTRAINT "InseePostal_codeInsee_fkey";

-- DropTable
DROP TABLE "public"."Commune";

-- DropTable
DROP TABLE "public"."InseePostal";

