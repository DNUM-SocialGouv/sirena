-- DropForeignKey
ALTER TABLE "public"."UploadedFile" DROP CONSTRAINT "UploadedFile_entiteId_fkey";

-- DropForeignKey
ALTER TABLE "public"."UploadedFile" DROP CONSTRAINT "UploadedFile_uploadedById_fkey";

-- DropForeignKey
ALTER TABLE "public"."UploadedFile" DROP CONSTRAINT "UploadedFile_requeteStateNoteId_fkey";

-- DropTable
DROP TABLE "public"."UploadedFile";

