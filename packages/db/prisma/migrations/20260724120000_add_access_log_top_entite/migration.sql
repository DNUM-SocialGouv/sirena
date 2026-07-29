-- AlterTable
ALTER TABLE "AccessLog" ADD COLUMN "topEntiteId" TEXT;

-- CreateIndex
CREATE INDEX "AccessLog_topEntiteId_idx" ON "AccessLog"("topEntiteId");
