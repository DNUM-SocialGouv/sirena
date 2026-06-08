-- Create DomainesFonctionnelsEnum reference table
CREATE TABLE "DomainesFonctionnelsEnum" (
  "id"    TEXT NOT NULL,
  "label" TEXT NOT NULL,
  CONSTRAINT "DomainesFonctionnelsEnum_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DomainesFonctionnelsEnum_label_key" ON "DomainesFonctionnelsEnum"("label");

-- Seed the 21 functional domains
INSERT INTO "DomainesFonctionnelsEnum" ("id", "label") VALUES
  ('SANITAIRE',                         'Sanitaire'),
  ('DOMICILE_HORS_PRO_PH',              'Domicile hors professionnel - Personnes handicapées'),
  ('DOMICILE_HORS_PRO_PA',              'Domicile hors professionnel - Personnes âgées'),
  ('HEBERGEMENT_VEILLE_SOCIALE',        'Hébergement et Veille sociale'),
  ('ACCUEIL_DEMANDEURS_ASILE',          'Accueil des demandeurs et des bénéficiaires de l''asile'),
  ('PROTECTION_MAJEURS',                'Protection des majeurs'),
  ('LOGEMENT_ADAPTE',                   'Logement adapté'),
  ('SOCIAL',                            'Social'),
  ('PERSONNES_DIFFICULTES_SPECIFIQUES', 'Personnes en difficultés spécifiques (ARS)'),
  ('MEDICO_SOCIAL_PA',                  'Médico-Social - Personnes âgées'),
  ('MEDICO_SOCIAL_HANDICAPES_ADULTES',  'Médico-Social - Handicapés adultes'),
  ('MEDICO_SOCIAL_HANDICAPES_ENFANTS',  'Médico-Social - Handicapés enfants'),
  ('SANTE_ENVIRONNEMENT',               'Santé environnement'),
  ('DEFAUT_OFFRE_SOINS_GENERAL',        'Défaut d''offre de soins - Général'),
  ('DEFAUT_OFFRE_SOINS_CAS_CRITIQUE',   'Défaut d''offre de soins - Cas critique'),
  ('HOSPITALISATIONS_CONTRAINTE',       'Hospitalisations sous contrainte'),
  ('AMBULATOIRE_GENERAL',               'Ambulatoire - Général'),
  ('AMBULATOIRE_TRANSPORT_SANITAIRE',   'Ambulatoire - Transport sanitaire'),
  ('PHARMACIES_LABORATOIRES',           'Pharmacies-Laboratoires'),
  ('ETABLISSEMENT_PENITENCIAIRE',       'Etablissement pénitenciaire'),
  ('AUTRES',                            'Autres')
ON CONFLICT ("id") DO UPDATE SET "label" = EXCLUDED."label";

-- Add nullable FK on Situation
ALTER TABLE "Situation" ADD COLUMN "domainesFonctionnelsId" TEXT;
ALTER TABLE "Situation" ADD CONSTRAINT "Situation_domainesFonctionnelsId_fkey"
  FOREIGN KEY ("domainesFonctionnelsId") REFERENCES "DomainesFonctionnelsEnum"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
