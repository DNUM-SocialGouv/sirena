-- AlterTable
ALTER TABLE "RequeteEtape"
ADD COLUMN "assignedEntiteId" TEXT;

-- CreateIndex
CREATE INDEX "RequeteEtape_assignedEntiteId_idx"
ON "RequeteEtape"("assignedEntiteId");

-- AddForeignKey
ALTER TABLE "RequeteEtape"
ADD CONSTRAINT "RequeteEtape_assignedEntiteId_fkey"
FOREIGN KEY ("assignedEntiteId") REFERENCES "Entite"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
