-- Add CD authority for establishment code 500 (EHPAD)
-- Code 500 (Etablissement d'hébergement pour personnes âgées dépendantes) is now
-- a shared competence between ARS and CD.
UPDATE "public"."AutoriteCompetenteReferentiel"
SET "entiteTypeIds" = ARRAY['ARS', 'CD']::text[]
WHERE "categCode" = '500';
