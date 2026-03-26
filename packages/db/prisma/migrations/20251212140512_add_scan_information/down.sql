-- DropIndex
DROP INDEX "UploadedFile_scanStatus_idx";

-- DropIndex
DROP INDEX "UploadedFile_status_idx";

-- AlterTable
ALTER TABLE "UploadedFile" DROP COLUMN "processingError",
DROP COLUMN "safeFilePath",
DROP COLUMN "sanitizeStatus",
DROP COLUMN "scanResult",
DROP COLUMN "scanStatus";
