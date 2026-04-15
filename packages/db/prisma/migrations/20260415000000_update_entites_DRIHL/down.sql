-- [DOWN] Revert INSERTs — not reversible because id is auto-generated at execution time
-- The following rows were inserted without a known id upfront.
-- To delete them, find their ids in DB and run the DELETE statements manually.
-- INSERT not reversible: nomComplet='DRIHL de Paris' entiteTypeId='DD'
-- INSERT not reversible: nomComplet='DRIHL de Seine-Saint-Denis' entiteTypeId='DD'
-- INSERT not reversible: nomComplet='DRIHL des Hauts-de-Seine' entiteTypeId='DD'
-- INSERT not reversible: nomComplet='DRIHL du Val-de-Marne' entiteTypeId='DD'

-- [DOWN] Revert UPDATEs
UPDATE "public"."Entite" SET "departementCode" = NULL, "regionCode" = NULL, "ctcdCode" = NULL, "dptLib" = NULL, "regLib" = NULL WHERE "label" = 'C. GUY';
UPDATE "public"."Entite" SET "adresseContactUsager" = '' WHERE "label" = 'ARS IDF';
