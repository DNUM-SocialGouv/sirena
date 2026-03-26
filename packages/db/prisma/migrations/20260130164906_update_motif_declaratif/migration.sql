UPDATE "public"."MotifDeclaratifEnum"
SET "label" = 'Problème lié au comportement d''une personne'
WHERE "id" = 'PROBLEME_COMPORTEMENTAL';

UPDATE "public"."MotifDeclaratifEnum"
SET "label" = 'Le non-respect des droits ou du secret médical'
WHERE "id" = 'NON_RESPECT_DROITS';

UPDATE "public"."MotifDeclaratifEnum"
SET "label" = 'Un manque d''information sur l''organisation de l''établissement ou du service'
WHERE "id" = 'PROBLEME_ORGANISATION';

UPDATE "public"."MotifDeclaratifEnum"
SET "label" = 'Problème de qualité des soins médicaux ou paramédicaux'
WHERE "id" = 'PROBLEME_QUALITE_SOINS';

UPDATE "public"."MotifDeclaratifEnum"
SET "label" = 'Autre (ex: tatouage, chirurgie et/ou soins esthétiques...)'
WHERE "id" = 'AUTRE';

UPDATE "public"."FaitMotifDeclaratif"
SET "motifDeclaratifId" = 'AUTRE'
WHERE "motifDeclaratifId" = 'DIFFICULTES_ACCES_SOINS';

DELETE FROM "public"."MotifDeclaratifEnum"
WHERE "id" = 'DIFFICULTES_ACCES_SOINS';
