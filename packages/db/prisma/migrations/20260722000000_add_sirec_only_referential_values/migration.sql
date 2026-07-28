-- Add declared motifs that only arrive through the SIREC migration (SIRENA-656).
INSERT INTO "MotifDeclaratifEnum" ("id", "label")
VALUES
  ('DIFFICULTES_ACCES_SOINS', 'Difficultés d''accès aux soins (établissement ou professionnel)'),
  ('MALTRAITANCE', 'Maltraitance (action ou défaut d''action individuelle, collective ou institutionnelle)'),
  ('PROBLEME_ORGANISATION_FONCTIONNEMENT', 'Problème d''organisation ou de fonctionnement de l''établissement ou du service')
ON CONFLICT ("id") DO UPDATE SET "label" = EXCLUDED."label";

-- Add reception types that only arrive through the SIREC migration (SIRENA-656).
INSERT INTO "ReceptionTypeEnum" ("id", "label")
VALUES
  ('INFO_MEDIA', 'Info par média'),
  ('PORTAIL_SIGNALEMENTS', 'Portail des signalements'),
  ('SIGNAL_CONSO', 'Signal Conso')
ON CONFLICT ("id") DO UPDATE SET "label" = EXCLUDED."label";

-- Add accused-party types that only arrive through the SIREC migration (SIRENA-656).
INSERT INTO "MisEnCauseTypeEnum" ("id", "label")
VALUES
  ('ETABLISSEMENT_FICTIF', 'Etablissement fictif'),
  ('EXERCICE_ILLEGAL', 'Exercice illégal'),
  ('MAISON_ARRET', 'Maison d''arrêt'),
  ('TRANSPORTEUR_SANITAIRE', 'Transporteur Sanitaire'),
  ('AUTRE', 'Autre')
ON CONFLICT ("id") DO UPDATE SET "label" = EXCLUDED."label";
