-- Backfill dateRealisation for ACKNOWLEDGMENT steps.
-- The earlier backfill (20260616130000) only handled type = 'MANUAL', so every
-- "Envoi de l'accusé de réception" step (type = 'ACKNOWLEDGMENT') that was marked
-- FAIT before this release kept dateRealisation = NULL. The edit panel then fell
-- back to today's date instead of the real send/mark-done date.
-- We rebuild the missing date from, in priority order:
--   1. the ChangeLog transition A_FAIRE -> FAIT (exact date it was set to "Fait"),
--   2. the AR PDF creation date (the non-deletable file attached on send),
--   3. the step's updatedAt (safety net; ~= send date for these rows).
UPDATE "RequeteEtape" re
SET "dateRealisation" = sub."date"
FROM (
  SELECT
    e.id AS etape_id,
    -- First non-null source (see priority above)
    COALESCE(cl."changedAt", uf."createdAt", e."updatedAt") AS "date"
  FROM "RequeteEtape" e
  -- Source 1: latest logged transition to FAIT for this step.
  LEFT JOIN LATERAL (
    SELECT cl."changedAt"
    FROM "ChangeLog" cl
    WHERE cl.entity = 'RequeteEtape'
      AND cl."entityId" = e.id
      AND cl.action = 'UPDATED'
      AND cl.after->>'statutId' = 'FAIT'        
      AND (cl.before->>'statutId') IS DISTINCT FROM 'FAIT'
    ORDER BY cl."changedAt" DESC
    LIMIT 1
  ) cl ON true
  -- Source 2: the AR PDF is attached with canDelete = false; its createdAt ~= send time.
  LEFT JOIN LATERAL (
    SELECT uf."createdAt"
    FROM "UploadedFile" uf
    WHERE uf."requeteEtapeId" = e.id
      AND uf."canDelete" = false
    ORDER BY uf."createdAt" ASC
    LIMIT 1
  ) uf ON true
  -- Only the acknowledgment steps that are done but still missing the date.
  WHERE e."type" = 'ACKNOWLEDGMENT'
    AND e."statutId" = 'FAIT'
    AND e."dateRealisation" IS NULL
) sub
WHERE re.id = sub.etape_id;
