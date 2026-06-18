UPDATE "RequeteEtape" re
SET "dateRealisation" = sub."changedAt"
FROM (
  SELECT DISTINCT ON (cl."entityId") cl."entityId", cl."changedAt"
  FROM "ChangeLog" cl
  WHERE cl.entity = 'RequeteEtape'
    AND cl.action = 'UPDATED'
    AND cl.after->>'statutId' = 'FAIT'
    AND (cl.before->>'statutId') IS DISTINCT FROM 'FAIT'
  ORDER BY cl."entityId", cl."changedAt" DESC
) sub
WHERE re.id = sub."entityId"
  AND re.type = 'MANUAL'
  AND re."statutId" = 'FAIT'
  AND re."dateRealisation" IS NULL;
