-- CreateIndex
CREATE INDEX "Requete_createdAt_idx" ON "Requete"("createdAt");

-- CreateIndex
CREATE INDEX "RequeteEntite_entiteId_statutId_idx" ON "RequeteEntite"("entiteId", "statutId");

-- CreateIndex
CREATE INDEX "RequeteEntite_entiteId_prioriteId_idx" ON "RequeteEntite"("entiteId", "prioriteId");
