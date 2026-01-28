-- AlterTable
ALTER TABLE "Requete" ADD COLUMN     "createdById" TEXT;

-- AddForeignKey
ALTER TABLE "Requete" ADD CONSTRAINT "Requete_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
