-- AlterTable
ALTER TABLE "Requete" ADD COLUMN "thirdPartyAccountId" TEXT;

-- AddForeignKey
ALTER TABLE "Requete" ADD CONSTRAINT "Requete_thirdPartyAccountId_fkey" FOREIGN KEY ("thirdPartyAccountId") REFERENCES "ThirdPartyAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
