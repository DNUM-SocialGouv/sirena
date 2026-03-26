-- DropForeignKey
ALTER TABLE "public"."UploadedFile" DROP CONSTRAINT "UploadedFile_uploadedById_fkey";

-- AlterTable
ALTER TABLE "public"."UploadedFile" ADD COLUMN     "demarchesEngageesId" TEXT,
ALTER COLUMN "uploadedById" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."UploadedFile" ADD CONSTRAINT "UploadedFile_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UploadedFile" ADD CONSTRAINT "UploadedFile_demarchesEngageesId_fkey" FOREIGN KEY ("demarchesEngageesId") REFERENCES "public"."DemarchesEngagees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
