-- SIRENA-656 (fix): reposition SIREC-only values into the correct referentials.
-- "Établissement fictif" / "Maison d'arrêt" / "Transporteur Sanitaire" were wrongly added as
-- accused-party types; they belong to the location referential. "Exercice illégal" becomes an
-- "Autre professionnel" precision. A generic maltraitance value carries SIREC "Maltraitance".

-- 1) New location type (Établissement fictif).
INSERT INTO "LieuTypeEnum" ("id", "label")
VALUES ('ETABLISSEMENT_FICTIF', 'Etablissement fictif')
ON CONFLICT ("id") DO UPDATE SET "label" = EXCLUDED."label";

-- 2) New "Autre professionnel" precision for Exercice illégal.
INSERT INTO "MisEnCauseTypePrecisionEnum" ("misEnCauseTypeId", "id", "label")
VALUES ('AUTRE_PROFESSIONNEL', 'EXERCICE_ILLEGAL', 'Exercice illégal')
ON CONFLICT ("misEnCauseTypeId", "id") DO UPDATE SET "label" = EXCLUDED."label";

-- 3) Generic maltraitance value fed only by the SIREC migration (dico 815), so a declared
--    "Maltraitance" from SIREC triggers the maltraitance tag like DematSocial does.
INSERT INTO "MaltraitanceTypeEnum" ("id", "label")
VALUES ('AUTRE', 'Maltraitance (action ou défaut d''action individuelle, collective ou institutionnelle)')
ON CONFLICT ("id") DO UPDATE SET "label" = EXCLUDED."label";

-- 4) Remap existing accused parties off the 4 mislocated types before removing them.
--    Exercice illégal -> Autre professionnel + its new precision.
UPDATE "MisEnCause"
SET "misEnCauseTypeId" = 'AUTRE_PROFESSIONNEL', "misEnCauseTypePrecisionId" = 'EXERCICE_ILLEGAL'
WHERE "misEnCauseTypeId" = 'EXERCICE_ILLEGAL';

--    The 3 location-bound types have no equivalent accused party; detach them
--    (their location cannot be reconstructed from historical rows in SQL).
UPDATE "MisEnCause"
SET "misEnCauseTypeId" = NULL, "misEnCauseTypePrecisionId" = NULL
WHERE "misEnCauseTypeId" IN ('ETABLISSEMENT_FICTIF', 'MAISON_ARRET', 'TRANSPORTEUR_SANITAIRE');

-- 5) Remove the 4 mislocated accused-party types (their precisions, if any, cascade).
DELETE FROM "MisEnCauseTypeEnum"
WHERE "id" IN ('ETABLISSEMENT_FICTIF', 'EXERCICE_ILLEGAL', 'MAISON_ARRET', 'TRANSPORTEUR_SANITAIRE');
