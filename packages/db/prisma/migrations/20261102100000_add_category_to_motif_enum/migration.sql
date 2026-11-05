-- AlterTable
ALTER TABLE "MotifEnum" ADD COLUMN "category" TEXT;

-- Backfill from the referential (packages/common/src/constants/motifs.constant.ts).
-- A motif id is PARENT/ENFANT, so the category is keyed on the id prefix.
UPDATE "MotifEnum" SET "category" = 'Activités d''esthétique non réglementées' WHERE "id" LIKE 'ACTIVITES_ESTHETIQUE_NON_REGLEMENTEES/%';
UPDATE "MotifEnum" SET "category" = 'Difficulté de recherche d''établissement ou d''un professionnel ou de service' WHERE "id" LIKE 'DIFFICULTE_RECHERCHE_ETABLISSEMENT_PROFESSIONNEL_SERVICE/%';
UPDATE "MotifEnum" SET "category" = 'Facturations et honoraires' WHERE "id" LIKE 'FACTURATIONS_HONORAIRES/%';
UPDATE "MotifEnum" SET "category" = 'Hôtellerie locaux restauration' WHERE "id" LIKE 'HOTELLERIE_LOCAUX_RESTAURATION/%';
UPDATE "MotifEnum" SET "category" = 'Informations et droits des usagers' WHERE "id" LIKE 'INFORMATIONS_DROITS_USAGERS/%';
UPDATE "MotifEnum" SET "category" = 'Maltraitance professionnels ou entourage' WHERE "id" LIKE 'MALTRAITANCE_PROFESSIONNELS_ENTOURAGE/%';
UPDATE "MotifEnum" SET "category" = 'Mauvaise attitude des professionnels' WHERE "id" LIKE 'MAUVAISE_ATTITUDE_PROFESSIONNELS/%';
UPDATE "MotifEnum" SET "category" = 'Médicaments' WHERE "id" LIKE 'MEDICAMENTS/%';
UPDATE "MotifEnum" SET "category" = 'Pratique non conventionnelle' WHERE "id" LIKE 'PRATIQUE_NON_CONVENTIONNELLE/%';
UPDATE "MotifEnum" SET "category" = 'Problèmes d''organisation ou de ressources humaines' WHERE "id" LIKE 'PROBLEMES_ORGANISATION_RESSOURCES_HUMAINES/%';
UPDATE "MotifEnum" SET "category" = 'Problèmes environnementaux' WHERE "id" LIKE 'PROBLEMES_ENVIRONNEMENTAUX/%';
UPDATE "MotifEnum" SET "category" = 'Problèmes liés au transport Sanitaire' WHERE "id" LIKE 'PROBLEMES_TRANSPORT_SANITAIRE/%';
UPDATE "MotifEnum" SET "category" = 'Qualité de l''accompagnement ou du service' WHERE "id" LIKE 'QUALITE_ACCOMPAGNEMENT_SERVICE/%';
UPDATE "MotifEnum" SET "category" = 'Qualité des soins' WHERE "id" LIKE 'QUALITE_SOINS/%';

-- A motif left over from an older referential keeps its raw prefix rather than blocking the
-- migration; diff_enums reports it as drift.
UPDATE "MotifEnum" SET "category" = split_part("id", '/', 1) WHERE "category" IS NULL;

ALTER TABLE "MotifEnum" ALTER COLUMN "category" SET NOT NULL;
