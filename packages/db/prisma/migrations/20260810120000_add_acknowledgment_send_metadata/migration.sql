-- CreateEnum
CREATE TYPE "AcknowledgmentSendMode" AS ENUM ('AUTOMATIC', 'MANUAL');

-- AlterTable
ALTER TABLE "RequeteEtape"
ADD COLUMN "acknowledgmentSendMode" "AcknowledgmentSendMode",
ADD COLUMN "acknowledgmentSendOperationId" UUID;

-- CreateIndex
CREATE INDEX "RequeteEtape_acknowledgmentSendOperationId_idx"
ON "RequeteEtape"("acknowledgmentSendOperationId");
