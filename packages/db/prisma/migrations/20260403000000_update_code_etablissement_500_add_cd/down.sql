-- Revert code 500 back to ARS only
UPDATE "public"."AutoriteCompetenteReferentiel"
SET "entiteTypeIds" = ARRAY['ARS']::text[]
WHERE "categCode" = '500';
