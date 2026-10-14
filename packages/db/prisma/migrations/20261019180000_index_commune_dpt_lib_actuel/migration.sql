-- The department filter and the export resolve SIREC department labels through
-- Commune.dptLibActuel, which had no index: the OR branch forced a sequential scan of the
-- 36 847 communes on every page of the list and on every export.
CREATE INDEX "Commune_dptLibActuel_idx" ON "Commune"("dptLibActuel");
