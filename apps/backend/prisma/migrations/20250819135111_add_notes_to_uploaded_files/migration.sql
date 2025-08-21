-- AlterTable
ALTER TABLE "public"."UploadedFile" ADD COLUMN     "requeteStateNoteId" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING';

-- AddForeignKey
ALTER TABLE "public"."UploadedFile" ADD CONSTRAINT "UploadedFile_requeteStateNoteId_fkey" FOREIGN KEY ("requeteStateNoteId") REFERENCES "public"."RequeteStateNote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
