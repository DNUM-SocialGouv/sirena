-- Revert code 460 back to ARS only
UPDATE "public"."AutoriteCompetenteReferentiel"
SET "entiteTypeIds" = ARRAY['ARS']::text[], "updatedAt" = now()
WHERE "categCode" = '460';
