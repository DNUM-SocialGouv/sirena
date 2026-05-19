-- Delete directions and services (entiteMereId IS NOT NULL) belonging to inactive entities
-- that have no associated requests. Entries with requests are preserved individually.
DELETE FROM "public"."Entite"
WHERE "entiteMereId" IN (
  SELECT id FROM "public"."Entite" WHERE "isActive" = false
)
AND id NOT IN (
  SELECT DISTINCT "entiteId" FROM "public"."RequeteEntite"
);
