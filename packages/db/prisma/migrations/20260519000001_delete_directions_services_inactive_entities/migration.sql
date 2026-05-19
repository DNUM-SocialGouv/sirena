-- Delete directions and services belonging to inactive entities
-- that have no associated requests or situations. Entries with requests or situations are preserved individually.
DELETE FROM "public"."Entite"
WHERE "entiteMereId" IN (
  SELECT id FROM "public"."Entite" WHERE "isActive" = false
)
AND id NOT IN (
  SELECT DISTINCT "entiteId" FROM "public"."RequeteEntite"
)
AND id NOT IN (
  SELECT DISTINCT "entiteId" FROM "public"."SituationEntite"
);
