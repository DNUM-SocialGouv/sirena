-- CreateEnum
CREATE TYPE "DocumentExportType" AS ENUM ('REQUETES_CSV');

-- CreateEnum
CREATE TYPE "DocumentExportStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'EXPIRED', 'FAILED');

-- AlterTable
ALTER TABLE "AccessLog" ADD COLUMN     "params" JSONB;

-- CreateTable
CREATE TABLE "DocumentExport" (
    "id" TEXT NOT NULL,
    "type" "DocumentExportType" NOT NULL,
    "status" "DocumentExportStatus" NOT NULL DEFAULT 'PENDING',
    "params" JSONB,
    "userId" TEXT NOT NULL,
    "topEntiteId" TEXT NOT NULL,
    "fileName" TEXT,
    "filePath" TEXT,
    "mimeType" TEXT,
    "size" INTEGER,
    "rowCount" INTEGER,
    "metadata" JSONB,
    "error" TEXT,
    "generatedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentExport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentExport_filePath_key" ON "DocumentExport"("filePath");

-- CreateIndex
CREATE INDEX "DocumentExport_userId_status_idx" ON "DocumentExport"("userId", "status");

-- CreateIndex
CREATE INDEX "DocumentExport_expiresAt_idx" ON "DocumentExport"("expiresAt");

-- AddForeignKey
ALTER TABLE "DocumentExport" ADD CONSTRAINT "DocumentExport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

