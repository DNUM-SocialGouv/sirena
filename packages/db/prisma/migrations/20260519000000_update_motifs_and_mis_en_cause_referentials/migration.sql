-- Add new qualified motifs replacing the generic "Violences entre usagers" motif.
INSERT INTO "MotifEnum" ("id", "label")
VALUES
  ('QUALITE_ACCOMPAGNEMENT_SERVICE/VIOLENCES_PHYSIQUES_ENTRE_USAGERS', 'Violences physiques entre usagers'),
  ('QUALITE_ACCOMPAGNEMENT_SERVICE/VIOLENCES_SEXUELLES_ENTRE_USAGERS', 'Violences sexuelles entre usagers'),
  ('QUALITE_ACCOMPAGNEMENT_SERVICE/VIOLENCES_PSYCHOLOGIQUES_ENTRE_USAGERS', 'Violences psychologiques entre usagers')
ON CONFLICT ("id") DO UPDATE SET "label" = EXCLUDED."label";

-- Add new establishment accused party precisions replacing the generic SAD/service precision.
INSERT INTO "MisEnCauseTypePrecisionEnum" ("id", "label", "misEnCauseTypeId")
VALUES
  ('SAD_MIXTE', 'SAD mixte', 'ETABLISSEMENT'),
  ('SAD_SOINS', 'SAD Soins', 'ETABLISSEMENT'),
  ('SAD_SANTE', 'SAD Santé', 'ETABLISSEMENT')
ON CONFLICT ("misEnCauseTypeId", "id") DO UPDATE SET "label" = EXCLUDED."label";

-- Migrate historical facts from the old generic motif to the new default physical-violence motif.
UPDATE "FaitMotif"
SET "motifId" = 'QUALITE_ACCOMPAGNEMENT_SERVICE/VIOLENCES_PHYSIQUES_ENTRE_USAGERS'
WHERE "motifId" = 'QUALITE_ACCOMPAGNEMENT_SERVICE/VIOLENCES_ENTRE_USAGERS';

-- Migrate historical accused parties from the old generic SAD/service precision to SAD mixte.
UPDATE "MisEnCause"
SET "misEnCauseTypePrecisionId" = 'SAD_MIXTE'
WHERE "misEnCauseTypeId" = 'ETABLISSEMENT'
  AND "misEnCauseTypePrecisionId" = 'SERVICE';

-- Remove obsolete referential values once no historical data points to them anymore.
DELETE FROM "MotifEnum"
WHERE "id" = 'QUALITE_ACCOMPAGNEMENT_SERVICE/VIOLENCES_ENTRE_USAGERS';

DELETE FROM "MisEnCauseTypePrecisionEnum"
WHERE "misEnCauseTypeId" = 'ETABLISSEMENT'
  AND "id" = 'SERVICE';
