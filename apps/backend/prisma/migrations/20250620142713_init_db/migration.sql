/*
  Warnings:

  - Made the column `entiteTypeId` on table `Entite` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Entite" DROP CONSTRAINT "Entite_entiteTypeId_fkey";

-- AlterTable
ALTER TABLE "Entite" ALTER COLUMN "entiteTypeId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Entite" ADD CONSTRAINT "Entite_entiteTypeId_fkey" FOREIGN KEY ("entiteTypeId") REFERENCES "EntiteTypeEnum"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
