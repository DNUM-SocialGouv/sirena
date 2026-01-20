-- DropForeignKey
ALTER TABLE "RequeteEtapeNote" DROP CONSTRAINT "RequeteEtapeNote_authorId_fkey";

-- AlterTable
ALTER TABLE "RequeteEtapeNote" ALTER COLUMN "authorId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "RequeteEtapeNote" ADD CONSTRAINT "RequeteEtapeNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
