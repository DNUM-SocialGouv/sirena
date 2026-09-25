-- DropForeignKey
ALTER TABLE "UploadedFile" DROP CONSTRAINT "UploadedFile_requeteMessageId_fkey";

-- DropIndex
DROP INDEX "UploadedFile_requeteMessageId_idx";

-- AlterTable
ALTER TABLE "UploadedFile" DROP COLUMN "requeteMessageId";

