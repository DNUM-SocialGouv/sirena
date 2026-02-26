-- =============================================================================
-- Migration: Create missing CD and DDETS Normandie entities
-- Source: Services_Normandie(CD_DDETS).csv
-- Rule: entities not in Entite → INSERT (directions / pôles / services).
-- =============================================================================

INSERT INTO "Entite" (
  "id",
  "nomComplet",
  "label",
  "email",
  "emailContactUsager",
  "telContactUsager",
  "adresseContactUsager",
  "emailDomain",
  "organizationalUnit",
  "isActive",
  "entiteTypeId",
  "entiteMereId"
) VALUES

-- -----------------------------------------------------------------------------
-- Directions / structures under CD (Conseils départementaux)
-- -----------------------------------------------------------------------------
-- CD76 – Direction de l'autonomie
('0049bded-e34d-4b85-b1fa-786198aecf81', 'Direction de l''autonomie', 'Direction autonomie', '', '', '', '', '', '', true, 'CD', 'bde95c33-c554-41fa-b87c-0d1e38ef8be5'),

-- CD61 – MDA (Maison Départementale de l'Autonomie)
('0952edd3-8cd2-4fc0-8d14-03243cecd0a3', 'MDA (Maison Départementale de l''Autonomie)', 'MDA', '', '', '', '', '', '', true, 'CD', '6df55d9f-f8d0-4d9b-990d-afc4f91c25c1'),

-- -----------------------------------------------------------------------------
-- Directions / pôles under DDETS50 (Manche)
-- -----------------------------------------------------------------------------
-- DDETS50 – Pôle égalité des chances, entreprises & compétences
('951e138c-82ff-4aeb-9c1c-b5c0c80bd0fa', 'Pôle égalité des chances, entreprises & compétences', 'Pôle égalité', '', '', '', '', '', '', true, 'DD', 'bbfd267d-77c9-4a62-9c9b-33a1200a065e'),

-- DDETS50 – Délégation départementale aux droits des femmes et à l'égalité
('cd2236b5-c2c7-4f23-a4b2-9494d23eb753', 'Délégation départementale aux droit des femmes et à l''égalité', 'Droit des femmes et égalité', '', '', '', '', '', '', true, 'DD', 'bbfd267d-77c9-4a62-9c9b-33a1200a065e'),

-- -----------------------------------------------------------------------------
-- DDETS76 (Seine-Maritime) – Pôles (no Collectivité in CSV = under DDETS76)
-- -----------------------------------------------------------------------------
-- Pôle cohésion sociale
('68845bba-1239-4c2e-8844-878a523ec4fc', 'Pôle cohésion sociale', 'Pôle cohésion sociale', 'ddets-cohesion-sociale@seine-maritime.gouv.fr', '', '', '', '', '', true, 'DD', '955aef76-d2ca-43d5-84ed-a3518abda9a3'),

-- Pôle insertion-emploi-entreprises
('35c25d16-9d21-42a3-a423-837f5de7ce4c', 'Pôle insertion-emploi-entreprises', 'Pôle insertion-emploi', 'ddets-insertion-emploi@seine-maritime.gouv.fr', '', '', '', '', '', true, 'DD', '955aef76-d2ca-43d5-84ed-a3518abda9a3'),

-- Pôle travail
('ff9b5c72-ee32-40fb-b447-47d5c73f6a7a', 'Pôle travail', 'Pôle travail', '', '', '', '', '', '', true, 'DD', '955aef76-d2ca-43d5-84ed-a3518abda9a3'),

-- -----------------------------------------------------------------------------
-- DDETS76 – Services under Pôle cohésion sociale
-- -----------------------------------------------------------------------------
('aa5aadfd-bf2b-474a-be7c-d599bde684b8', 'Service du logement d''abord', 'Logement d''abord', 'ddets-logement-dabord@seine-maritime.gouv.fr', '', '', '', '', '', true, 'DD', '68845bba-1239-4c2e-8844-878a523ec4fc'),
('c54d15f7-f3d1-4421-9a74-ea0914826e05', 'Service logement Dalo', 'Logement Dalo', 'ddets-dalo@seine-maritime.gouv.fr', '', '', '', '', '', true, 'DD', '68845bba-1239-4c2e-8844-878a523ec4fc'),
('587995af-f87b-4d2f-9314-3970c3103409', 'Service logement CCAPEX', 'Logement CCAPEX', 'ddets-ccapex@seine-maritime.gouv.fr', '', '', '', '', '', true, 'DD', '68845bba-1239-4c2e-8844-878a523ec4fc'),
('48ec5c18-f0b0-464b-b923-9d5dd4dc76a2', 'Service logement Contingent', 'Logement Contingent', 'ddets-contingent@seine-maritime.gouv.fr', '', '', '', '', '', true, 'DD', '68845bba-1239-4c2e-8844-878a523ec4fc'),
('65732394-d1b1-4448-b308-f15cb5f1fbe4', 'Service personnes vulnérables', 'Personnes vulnérables', 'ddets-personnes-vulnerables@seine-maritime.gouv.fr', '', '', '', '', '', true, 'DD', '68845bba-1239-4c2e-8844-878a523ec4fc'),

-- -----------------------------------------------------------------------------
-- DDETS76 – Service under Pôle travail
-- -----------------------------------------------------------------------------
('ebd65e58-8d6f-46a6-88dd-30bb1ba9d067', 'Service cellule négociation collective', 'Cellule négociation collective', 'ddets-accord-entreprise@seine-maritime.gouv.fr', '', '', '', '', '', true, 'DD', 'ff9b5c72-ee32-40fb-b447-47d5c73f6a7a'),

-- -----------------------------------------------------------------------------
-- DDETS76 – Units and services under Pôle travail
-- -----------------------------------------------------------------------------
('c61ae0bb-0716-423d-b8a5-ff13fe0981de', 'Unité de contrôle 1', 'Unité contrôle 1', 'ddets-inspection1@seine-maritime.gouv.fr', '', '', '', '', '', true, 'DD', 'ff9b5c72-ee32-40fb-b447-47d5c73f6a7a'),
('23cd45b4-605d-473d-ad7c-7c69503eec93', 'Unité de contrôle 2', 'Unité contrôle 2', 'ddets-inspection2@seine-maritime.gouv.fr', '', '', '', '', '', true, 'DD', 'ff9b5c72-ee32-40fb-b447-47d5c73f6a7a'),
('05d88815-3275-4691-897f-2450289ac7e0', 'Unité de contrôle 3', 'Unité contrôle 3', 'ddets-inspection3@seine-maritime.gouv.fr', '', '', '', '', '', true, 'DD', 'ff9b5c72-ee32-40fb-b447-47d5c73f6a7a'),
('d1a7b61e-af98-4e00-9777-b8dd18c5502b', 'Unité de contrôle 4', 'Unité contrôle 4', 'ddets-inspection4@seine-maritime.gouv.fr', '', '', '', '', '', true, 'DD', 'ff9b5c72-ee32-40fb-b447-47d5c73f6a7a'),
('1e57fa6d-89e4-4160-83f4-caf761a1cdcd', 'Service renseignement', 'Service renseignement', 'ddets-renseignements-travail@seine-maritime.gouv.fr', '', '', '', '', '', true, 'DD', 'ff9b5c72-ee32-40fb-b447-47d5c73f6a7a')

ON CONFLICT ("id") DO NOTHING;
