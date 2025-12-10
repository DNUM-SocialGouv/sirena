-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- DropForeignKey
ALTER TABLE "public"."RequeteEntite" DROP CONSTRAINT "RequeteEntite_prioriteId_fkey";

-- AlterTable
ALTER TABLE "public"."RequeteEntite" DROP COLUMN "prioriteId";

-- DropTable
DROP TABLE "public"."RequetePrioriteEnum";

