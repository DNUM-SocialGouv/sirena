-- SIRENA-656

-- Declared motifs
INSERT INTO "MotifDeclaratifEnum" ("id", "label")
VALUES
  ('DIFFICULTES_ACCES_SOINS', 'Difficultés d''accès aux soins (établissement ou professionnel)'),
  ('MALTRAITANCE', 'Maltraitance (action ou défaut d''action individuelle, collective ou institutionnelle)'),
  ('PROBLEME_ORGANISATION_FONCTIONNEMENT', 'Problème d''organisation ou de fonctionnement de l''établissement ou du service')
ON CONFLICT ("id") DO UPDATE SET "label" = EXCLUDED."label";

-- Reception modes
INSERT INTO "ReceptionTypeEnum" ("id", "label")
VALUES
  ('INFO_MEDIA', 'Info par média'),
  ('PORTAIL_SIGNALEMENTS', 'Portail des signalements'),
  ('SIGNAL_CONSO', 'Signal Conso')
ON CONFLICT ("id") DO UPDATE SET "label" = EXCLUDED."label";

-- Location type
INSERT INTO "LieuTypeEnum" ("id", "label")
VALUES ('ETABLISSEMENT_FICTIF', 'Etablissement fictif')
ON CONFLICT ("id") DO UPDATE SET "label" = EXCLUDED."label";

INSERT INTO "MisEnCauseTypePrecisionEnum" ("misEnCauseTypeId", "id", "label")
VALUES ('AUTRE_PROFESSIONNEL', 'EXERCICE_ILLEGAL', 'Exercice illégal')
ON CONFLICT ("misEnCauseTypeId", "id") DO UPDATE SET "label" = EXCLUDED."label";
