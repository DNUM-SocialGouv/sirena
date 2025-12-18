-- DropForeignKey
ALTER TABLE "Requete" DROP CONSTRAINT "Requete_receptionTypeId_fkey";

-- AlterTable
ALTER TABLE "Requete" ALTER COLUMN "receptionTypeId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Requete" ADD CONSTRAINT "Requete_receptionTypeId_fkey" FOREIGN KEY ("receptionTypeId") REFERENCES "ReceptionTypeEnum"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
