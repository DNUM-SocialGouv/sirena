-- Restore obsolete referential values before migrating data back to them.
INSERT INTO "MotifEnum" ("id", "label")
VALUES ('QUALITE_ACCOMPAGNEMENT_SERVICE/VIOLENCES_ENTRE_USAGERS', 'Violences entre usagers')
ON CONFLICT ("id") DO UPDATE SET "label" = EXCLUDED."label";

INSERT INTO "MisEnCauseTypePrecisionEnum" ("id", "label", "misEnCauseTypeId")
VALUES ('SERVICE', 'Services de soins infirmiers ou d''aide à domicile (SAAD, SSIAD, SPASAD)', 'ETABLISSEMENT')
ON CONFLICT ("misEnCauseTypeId", "id") DO UPDATE SET "label" = EXCLUDED."label";

-- Roll back all new violence-between-users motifs to the old generic motif.
UPDATE "FaitMotif"
SET "motifId" = 'QUALITE_ACCOMPAGNEMENT_SERVICE/VIOLENCES_ENTRE_USAGERS'
WHERE "motifId" IN (
  'QUALITE_ACCOMPAGNEMENT_SERVICE/VIOLENCES_PHYSIQUES_ENTRE_USAGERS',
  'QUALITE_ACCOMPAGNEMENT_SERVICE/VIOLENCES_SEXUELLES_ENTRE_USAGERS',
  'QUALITE_ACCOMPAGNEMENT_SERVICE/VIOLENCES_PSYCHOLOGIQUES_ENTRE_USAGERS'
);

-- Roll back all new SAD precisions to the old generic SAD/service precision.
UPDATE "MisEnCause"
SET "misEnCauseTypePrecisionId" = 'SERVICE'
WHERE "misEnCauseTypeId" = 'ETABLISSEMENT'
  AND "misEnCauseTypePrecisionId" IN ('SAD_MIXTE', 'SAD_SOINS', 'SAD_SANTE');

-- Remove new referential values once no data points to them anymore.
DELETE FROM "MotifEnum"
WHERE "id" IN (
  'QUALITE_ACCOMPAGNEMENT_SERVICE/VIOLENCES_PHYSIQUES_ENTRE_USAGERS',
  'QUALITE_ACCOMPAGNEMENT_SERVICE/VIOLENCES_SEXUELLES_ENTRE_USAGERS',
  'QUALITE_ACCOMPAGNEMENT_SERVICE/VIOLENCES_PSYCHOLOGIQUES_ENTRE_USAGERS'
);

DELETE FROM "MisEnCauseTypePrecisionEnum"
WHERE "misEnCauseTypeId" = 'ETABLISSEMENT'
  AND "id" IN ('SAD_MIXTE', 'SAD_SOINS', 'SAD_SANTE');
