-- DropForeignKey
ALTER TABLE "public"."Requete" DROP CONSTRAINT "Requete_createdById_fkey";

-- AlterTable
ALTER TABLE "public"."Requete" DROP COLUMN "createdById";

