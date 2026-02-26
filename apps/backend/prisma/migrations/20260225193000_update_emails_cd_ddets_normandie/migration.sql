-- =============================================================================
-- Migration: Update emails for CD and DDETS Normandie entities
-- Source: Services_Normandie(CD_DDETS).csv
-- Rule: existing entities → UPDATE email only.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- CD (Conseils départementaux) – top-level entity
-- -----------------------------------------------------------------------------
-- CD76 – Conseil départemental de La Seine-Maritime
UPDATE "Entite" SET email = 'dasignalement@seinemaritime.fr' WHERE id = 'bde95c33-c554-41fa-b87c-0d1e38ef8be5';

-- CD61 – Conseil départemental de L'Orne
UPDATE "Entite" SET email = 'signalementsirena@orne.fr' WHERE id = '6df55d9f-f8d0-4d9b-990d-afc4f91c25c1';

-- CD14 – Conseil départemental du Calvados
UPDATE "Entite" SET email = 'da.signalements@calvados.fr' WHERE id = 'dff5c7eb-5833-4333-b3ca-84cedc3b5e16';

-- CD50 – Conseil départemental de la Manche
UPDATE "Entite" SET email = 'sirenacd50@manche.fr' WHERE id = '8cee127d-f97e-418c-b68d-0212f0b71a1a';

-- -----------------------------------------------------------------------------
-- DDETS – top-level entity
-- -----------------------------------------------------------------------------
-- DDETS14 – DDETS du Calvados
UPDATE "Entite" SET email = 'ddets-tpmr@calvados.gouv.fr' WHERE id = '0f596edf-0321-4f06-84b9-4d3183a0ab8f';

-- DDETS27 – DDETS de l'Eure
UPDATE "Entite" SET email = 'ddets-pole-ssa@eure.gouv.fr' WHERE id = 'bab7fae9-7f92-47c4-b46c-8cca8d4a82f0';

-- DDETS50 – DDETS de la Manche
UPDATE "Entite" SET email = 'ddets@manche.gouv.fr' WHERE id = 'bbfd267d-77c9-4a62-9c9b-33a1200a065e';

-- DDETS76 – DDETS de la Seine-Maritime
UPDATE "Entite" SET email = 'ddets-direction@seine-maritime.gouv.fr' WHERE id = '955aef76-d2ca-43d5-84ed-a3518abda9a3';
