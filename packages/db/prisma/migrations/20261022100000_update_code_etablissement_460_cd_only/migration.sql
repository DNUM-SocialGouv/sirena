-- Route establishment code 460 to CD only
-- Code 460 (Service autonomie aide (SAA)/Antenne médico-social) is a CD competence,
-- not an ARS one.
UPDATE "public"."AutoriteCompetenteReferentiel"
SET "entiteTypeIds" = ARRAY['CD']::text[], "updatedAt" = now()
WHERE "categCode" = '460';
