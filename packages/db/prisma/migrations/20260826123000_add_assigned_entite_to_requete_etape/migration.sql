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
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Only assignment steps have a target, and every assignment step must have one.
ALTER TABLE "RequeteEtape"
ADD CONSTRAINT "RequeteEtape_assignment_target_check"
CHECK (
  ("type" = 'ASSIGNMENT' AND "assignedEntiteId" IS NOT NULL)
  OR ("type" <> 'ASSIGNMENT' AND "assignedEntiteId" IS NULL)
);
