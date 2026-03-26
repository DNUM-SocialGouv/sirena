-- [DOWN] Restore MotifDeclaratifEnum value removed in up migration
INSERT INTO "public"."MotifDeclaratifEnum" ("id", "label") VALUES
('DIFFICULTES_ACCES_SOINS', 'Difficultés d''accès aux soins (établissement ou professionnel) (ex: manque de moyen humain...)')
ON CONFLICT ("id") DO NOTHING;

-- [DOWN] Restore relations to DIFFICULTES_ACCES_SOINS
UPDATE "public"."FaitMotifDeclaratif"
SET "motifDeclaratifId" = 'DIFFICULTES_ACCES_SOINS'
WHERE "motifDeclaratifId" = 'AUTRE';

-- [DOWN] Restore previous labels
UPDATE "public"."MotifDeclaratifEnum"
SET "label" = 'Problème comportemental, relationnel ou de communication avec une personne'
WHERE "id" = 'PROBLEME_COMPORTEMENTAL';

UPDATE "public"."MotifDeclaratifEnum"
SET "label" = 'Non-respect des droits des usagers dont défaut d’information (ex : non prise en compte de l''expression de besoin de la personne accompagnée, travail illégal...)'
WHERE "id" = 'NON_RESPECT_DROITS';

UPDATE "public"."MotifDeclaratifEnum"
SET "label" = 'Problème d’organisation ou de fonctionnement de l’établissement ou du service (ex : Management, plannings, condition de travail...)'
WHERE "id" = 'PROBLEME_ORGANISATION';

UPDATE "public"."MotifDeclaratifEnum"
SET "label" = 'Problème de qualité des soins médicaux ou paramédicaux (ex: soins et/ou interventions inadaptés, absents ou abusifs...)'
WHERE "id" = 'PROBLEME_QUALITE_SOINS';

UPDATE "public"."MotifDeclaratifEnum"
SET "label" = 'Autre (ex: tatouage, chirurgie et/ou soins esthétiques...)'
WHERE "id" = 'AUTRE';
