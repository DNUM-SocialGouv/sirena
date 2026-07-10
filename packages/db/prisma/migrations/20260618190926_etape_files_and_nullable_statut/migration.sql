-- DropForeignKey
ALTER TABLE "RequeteEtape" DROP CONSTRAINT "RequeteEtape_statutId_fkey";

-- AlterTable
ALTER TABLE "RequeteEtape" ALTER COLUMN "statutId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "UploadedFile" ADD COLUMN     "requeteEtapeId" TEXT;

-- CreateIndex
CREATE INDEX "UploadedFile_requeteEtapeId_idx" ON "UploadedFile"("requeteEtapeId");

-- AddForeignKey
ALTER TABLE "RequeteEtape" ADD CONSTRAINT "RequeteEtape_statutId_fkey" FOREIGN KEY ("statutId") REFERENCES "RequeteEtapeStatutEnum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadedFile" ADD CONSTRAINT "UploadedFile_requeteEtapeId_fkey" FOREIGN KEY ("requeteEtapeId") REFERENCES "RequeteEtape"("id") ON DELETE CASCADE ON UPDATE CASCADE;
