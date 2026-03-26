-- Deactivate all entities with regionCode "28" and all their descendant entities recursively
WITH RECURSIVE entites_to_deactivate AS (
  SELECT id
  FROM "Entite"
  WHERE "regionCode" = '28'
  
  UNION
  
  SELECT e.id
  FROM "Entite" e
  INNER JOIN entites_to_deactivate etd ON e."entiteMereId" = etd.id
)
UPDATE "Entite"
SET "isActive" = false
WHERE id IN (SELECT id FROM entites_to_deactivate);

