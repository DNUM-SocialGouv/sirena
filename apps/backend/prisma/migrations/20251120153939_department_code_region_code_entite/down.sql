-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- AlterTable
ALTER TABLE "public"."Entite" DROP COLUMN "departementCode",
DROP COLUMN "regionCode";

