-- AlterTable
ALTER TABLE "UploadedFile" ADD COLUMN     "requeteMessageId" TEXT;

-- CreateIndex
CREATE INDEX "UploadedFile_requeteMessageId_idx" ON "UploadedFile"("requeteMessageId");

-- AddForeignKey
ALTER TABLE "UploadedFile" ADD CONSTRAINT "UploadedFile_requeteMessageId_fkey" FOREIGN KEY ("requeteMessageId") REFERENCES "RequeteMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

