-- Activate all entities with regionCode "28" and all their descendant entities recursively
WITH RECURSIVE entites_to_activate AS (
  SELECT id
  FROM "Entite"
  WHERE "regionCode" = '28'
  
  UNION
  
  SELECT e.id
  FROM "Entite" e
  INNER JOIN entites_to_activate eta ON e."entiteMereId" = eta.id
)
UPDATE "Entite"
SET "isActive" = true
WHERE id IN (SELECT id FROM entites_to_activate);

