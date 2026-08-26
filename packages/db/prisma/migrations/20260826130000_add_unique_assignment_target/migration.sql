-- Guarantee at most one assignment step per request and assigned administrative entity.
-- PostgreSQL unique indexes allow multiple NULL targets, preserving every non-assignment step.
CREATE UNIQUE INDEX "RequeteEtape_requeteId_assignedEntiteId_key"
ON "RequeteEtape"("requeteId", "assignedEntiteId");
