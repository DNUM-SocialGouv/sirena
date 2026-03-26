-- AlterTable
ALTER TABLE "UploadedFile" ADD COLUMN     "processingError" TEXT,
ADD COLUMN     "safeFilePath" TEXT,
ADD COLUMN     "sanitizeStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "scanResult" JSONB,
ADD COLUMN     "scanStatus" TEXT NOT NULL DEFAULT 'PENDING';
