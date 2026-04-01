-- ============================================================
-- BACKFILL : remplissage initial de la DB analytics
-- A lancer une seule fois apres la mise en place des triggers
-- ============================================================

-- 1. Dimensions enum
INSERT INTO analytics_fdw.dim_motif (id, label)
    SELECT id, label FROM "MotifEnum"
    ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label;

INSERT INTO analytics_fdw.dim_motif_declaratif (id, label)
    SELECT id, label FROM "MotifDeclaratifEnum"
    ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label;

INSERT INTO analytics_fdw.dim_consequence (id, label)
    SELECT id, label FROM "ConsequenceEnum"
    ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label;

INSERT INTO analytics_fdw.dim_maltraitance_type (id, label)
    SELECT id, label FROM "MaltraitanceTypeEnum"
    ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label;

INSERT INTO analytics_fdw.dim_mis_en_cause_type (id, label)
    SELECT id, label FROM "MisEnCauseTypeEnum"
    ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label;

INSERT INTO analytics_fdw.dim_lieu_type (id, label)
    SELECT id, label FROM "LieuTypeEnum"
    ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label;

INSERT INTO analytics_fdw.dim_reception_type (id, label)
    SELECT id, label FROM "ReceptionTypeEnum"
    ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label;

INSERT INTO analytics_fdw.dim_provenance (id, label)
    SELECT id, label FROM "RequeteProvenanceEnum"
    ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label;

INSERT INTO analytics_fdw.dim_statut_requete (id, label)
    SELECT id, label FROM "RequeteStatusEnum"
    ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label;

INSERT INTO analytics_fdw.dim_etape_statut (id, label)
    SELECT id, label FROM "RequeteEtapeStatutEnum"
    ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label;

INSERT INTO analytics_fdw.dim_cloture_reason (id, label)
    SELECT id, label FROM "RequeteClotureReasonEnum"
    ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label;

INSERT INTO analytics_fdw.dim_priorite (id, label, sort_order)
    SELECT id, label, "sortOrder" FROM "RequetePrioriteEnum"
    ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order;

-- 2. Entites
INSERT INTO analytics_fdw.dim_entite (
    id, nom_complet, label, entite_type_id, entite_type,
    entite_mere_id, departement_code, region_code,
    region_lib, departement_lib, is_active, updated_at
)
SELECT
    e.id, e."nomComplet", e.label, e."entiteTypeId", et.label,
    e."entiteMereId", e."departementCode", e."regionCode",
    e."regLib", e."dptLib", e."isActive", NOW()
FROM "Entite" e
LEFT JOIN "EntiteTypeEnum" et ON et.id = e."entiteTypeId"
ON CONFLICT (id) DO UPDATE SET
    nom_complet = EXCLUDED.nom_complet,
    label = EXCLUDED.label,
    entite_type = EXCLUDED.entite_type,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- 3. Communes
INSERT INTO analytics_fdw.dim_commune (
    com_code, com_lib, dpt_code, dpt_lib,
    reg_code, reg_lib, ctcd_code, ctcd_lib, updated_at
)
SELECT
    "comCode", "comLib",
    "dptCodeActuel", "dptLibActuel",
    "regCodeActuel", "regLibActuel",
    "ctcdCodeActuel", "ctcdLibActuel",
    NOW()
FROM "Commune"
ON CONFLICT (com_code) DO UPDATE SET
    com_lib = EXCLUDED.com_lib,
    dpt_code = EXCLUDED.dpt_code,
    dpt_lib = EXCLUDED.dpt_lib,
    reg_code = EXCLUDED.reg_code,
    reg_lib = EXCLUDED.reg_lib,
    updated_at = NOW();

-- 4. Fact requete (from RequeteEntite)
INSERT INTO analytics_fdw.fact_requete (
    requete_id, entite_id, temps_reception_id,
    reception_type_id, provenance_id, statut_id, priorite_id,
    lieu_type_id, lieu_commune_code, mis_en_cause_type_id,
    fait_date_debut_id, fait_date_fin_id,
    nb_etapes, nb_situations,
    created_at, updated_at
)
SELECT
    re."requeteId",
    re."entiteId",
    CASE WHEN r."receptionDate" IS NOT NULL
        THEN TO_CHAR(r."receptionDate", 'YYYYMMDD')::INTEGER END,
    r."receptionTypeId",
    r."provenanceId",
    re."statutId",
    re."prioriteId",
    lds."lieuTypeId",
    ip."codeInsee",
    mc."misEnCauseTypeId",
    CASE WHEN f."dateDebut" IS NOT NULL
        THEN TO_CHAR(f."dateDebut", 'YYYYMMDD')::INTEGER END,
    CASE WHEN f."dateFin" IS NOT NULL
        THEN TO_CHAR(f."dateFin", 'YYYYMMDD')::INTEGER END,
    (SELECT COUNT(*) FROM "RequeteEtape" e
        WHERE e."requeteId" = re."requeteId" AND e."entiteId" = re."entiteId"),
    (SELECT COUNT(*) FROM "Situation" s WHERE s."requeteId" = re."requeteId"),
    r."createdAt",
    NOW()
FROM "RequeteEntite" re
JOIN "Requete" r ON r.id = re."requeteId"
LEFT JOIN LATERAL (
    SELECT s.id, s."lieuDeSurvenueId", s."misEnCauseId"
    FROM "Situation" s WHERE s."requeteId" = re."requeteId" LIMIT 1
) sit ON TRUE
LEFT JOIN "LieuDeSurvenue" lds ON lds.id = sit."lieuDeSurvenueId"
LEFT JOIN "InseePostal" ip ON ip."codePostal" = lds."codePostal"
    AND ip."codePostal" != ''
LEFT JOIN "MisEnCause" mc ON mc.id = sit."misEnCauseId"
LEFT JOIN "Fait" f ON f."situationId" = sit.id
ON CONFLICT (requete_id, entite_id) DO UPDATE SET
    statut_id = EXCLUDED.statut_id,
    priorite_id = EXCLUDED.priorite_id,
    nb_etapes = EXCLUDED.nb_etapes,
    nb_situations = EXCLUDED.nb_situations,
    updated_at = NOW();

-- 5. Fact etape
INSERT INTO analytics_fdw.fact_etape (
    id, requete_id, entite_id, nom, est_partagee,
    statut_id, temps_creation_id, created_at, updated_at
)
SELECT
    e.id,
    e."requeteId",
    e."entiteId",
    e.nom,
    e."estPartagee",
    e."statutId",
    TO_CHAR(e."createdAt", 'YYYYMMDD')::INTEGER,
    e."createdAt",
    NOW()
FROM "RequeteEtape" e
ON CONFLICT (id) DO UPDATE SET
    nom = EXCLUDED.nom,
    est_partagee = EXCLUDED.est_partagee,
    statut_id = EXCLUDED.statut_id,
    updated_at = NOW();

-- 6. Bridge tables
INSERT INTO analytics_fdw.bridge_fait_motif (situation_id, motif_id)
    SELECT "situationId", "motifId" FROM "FaitMotif"
    ON CONFLICT DO NOTHING;

INSERT INTO analytics_fdw.bridge_fait_motif_declaratif (situation_id, motif_declaratif_id)
    SELECT "situationId", "motifDeclaratifId" FROM "FaitMotifDeclaratif"
    ON CONFLICT DO NOTHING;

INSERT INTO analytics_fdw.bridge_fait_consequence (situation_id, consequence_id)
    SELECT "situationId", "consequenceId" FROM "FaitConsequence"
    ON CONFLICT DO NOTHING;

INSERT INTO analytics_fdw.bridge_fait_maltraitance_type (situation_id, maltraitance_type_id)
    SELECT "situationId", "maltraitanceTypeId" FROM "FaitMaltraitanceType"
    ON CONFLICT DO NOTHING;

-- 7. Update sync cursors
INSERT INTO analytics_fdw.sync_cursor (table_name, last_synced, row_count)
VALUES
    ('dim_entite',       NOW(), (SELECT COUNT(*) FROM "Entite")),
    ('dim_commune',      NOW(), (SELECT COUNT(*) FROM "Commune")),
    ('fact_requete',     NOW(), (SELECT COUNT(*) FROM "RequeteEntite")),
    ('fact_etape',       NOW(), (SELECT COUNT(*) FROM "RequeteEtape")),
    ('bridge_fait_motif', NOW(), (SELECT COUNT(*) FROM "FaitMotif"))
ON CONFLICT (table_name) DO UPDATE SET
    last_synced = NOW(),
    row_count = EXCLUDED.row_count;
