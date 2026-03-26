/*
  Warnings:

  - The `dematSocialId` column on the `Requete` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `number` column on the `RequeteEntite` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- DropIndex
DROP INDEX "Requete_dematSocialId_key";

-- AlterTable
ALTER TABLE "Requete" ADD COLUMN     "number" SERIAL NOT NULL,
DROP COLUMN "dematSocialId",
ADD COLUMN     "dematSocialId" INTEGER;

-- AlterTable
ALTER TABLE "RequeteEntite" DROP COLUMN "number",
ADD COLUMN     "number" SERIAL NOT NULL;
