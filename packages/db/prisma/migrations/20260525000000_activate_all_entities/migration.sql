-- Activate all entities
-- Setting isActive = true on all entities 
UPDATE "public"."Entite"
SET "isActive" = true
WHERE "isActive" = false;
