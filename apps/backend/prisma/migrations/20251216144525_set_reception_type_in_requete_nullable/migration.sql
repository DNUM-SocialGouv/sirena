-- DropForeignKey
ALTER TABLE "Requete" DROP CONSTRAINT "Requete_receptionTypeId_fkey";

-- AlterTable
ALTER TABLE "Requete" ALTER COLUMN "receptionTypeId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Requete" ADD CONSTRAINT "Requete_receptionTypeId_fkey" FOREIGN KEY ("receptionTypeId") REFERENCES "ReceptionTypeEnum"("id") ON DELETE SET NULL ON UPDATE CASCADE;
