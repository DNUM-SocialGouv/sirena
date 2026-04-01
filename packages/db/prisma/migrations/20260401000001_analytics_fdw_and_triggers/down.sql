-- ============================================================
-- DOWN: FOREIGN DATA WRAPPER + TRIGGERS — DB Source (Sirena)
-- Drops everything created by 002_fdw_and_triggers
-- ============================================================

-- 1. Drop triggers (bridge tables)
DROP TRIGGER IF EXISTS trg_analytics_bridge_fait_maltraitance ON "FaitMaltraitanceType";
DROP TRIGGER IF EXISTS trg_analytics_bridge_fait_consequence ON "FaitConsequence";
DROP TRIGGER IF EXISTS trg_analytics_bridge_fait_motif_declaratif ON "FaitMotifDeclaratif";
DROP TRIGGER IF EXISTS trg_analytics_bridge_fait_motif ON "FaitMotif";

-- 2. Drop triggers (fact tables)
DROP TRIGGER IF EXISTS trg_analytics_fact_etape ON "RequeteEtape";
DROP TRIGGER IF EXISTS trg_analytics_fact_requete ON "RequeteEntite";

-- 3. Drop triggers (dimensions)
DROP TRIGGER IF EXISTS trg_analytics_cloture_reason ON "RequeteClotureReasonEnum";
DROP TRIGGER IF EXISTS trg_analytics_etape_statut ON "RequeteEtapeStatutEnum";
DROP TRIGGER IF EXISTS trg_analytics_statut_requete ON "RequeteStatusEnum";
DROP TRIGGER IF EXISTS trg_analytics_provenance ON "RequeteProvenanceEnum";
DROP TRIGGER IF EXISTS trg_analytics_reception_type ON "ReceptionTypeEnum";
DROP TRIGGER IF EXISTS trg_analytics_lieu_type ON "LieuTypeEnum";
DROP TRIGGER IF EXISTS trg_analytics_mis_en_cause_type ON "MisEnCauseTypeEnum";
DROP TRIGGER IF EXISTS trg_analytics_maltraitance_type ON "MaltraitanceTypeEnum";
DROP TRIGGER IF EXISTS trg_analytics_consequence ON "ConsequenceEnum";
DROP TRIGGER IF EXISTS trg_analytics_motif_declaratif ON "MotifDeclaratifEnum";
DROP TRIGGER IF EXISTS trg_analytics_motif ON "MotifEnum";
DROP TRIGGER IF EXISTS trg_analytics_priorite ON "RequetePrioriteEnum";
DROP TRIGGER IF EXISTS trg_analytics_entite ON "Entite";
DROP TRIGGER IF EXISTS trg_analytics_commune ON "Commune";

-- 4. Drop trigger functions
DROP FUNCTION IF EXISTS trg_sync_bridge_fait_maltraitance();
DROP FUNCTION IF EXISTS trg_sync_bridge_fait_consequence();
DROP FUNCTION IF EXISTS trg_sync_bridge_fait_motif_declaratif();
DROP FUNCTION IF EXISTS trg_sync_bridge_fait_motif();
DROP FUNCTION IF EXISTS trg_sync_fact_etape();
DROP FUNCTION IF EXISTS trg_sync_fact_requete();
DROP FUNCTION IF EXISTS trg_sync_dim_commune();
DROP FUNCTION IF EXISTS trg_sync_dim_entite();
DROP FUNCTION IF EXISTS trg_sync_dim_priorite();
DROP FUNCTION IF EXISTS trg_sync_dim_enum();

-- 5. Drop helpers
DROP FUNCTION IF EXISTS analytics_fdw.log_sync(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS analytics_fdw.is_sync_enabled();

-- 6. Drop foreign schema (drops all foreign tables)
DROP SCHEMA IF EXISTS analytics_fdw CASCADE;

-- 7. Drop user mapping and server
DROP USER MAPPING IF EXISTS FOR CURRENT_USER SERVER analytics_server;
DROP SERVER IF EXISTS analytics_server CASCADE;

-- Note: we intentionally do NOT drop the postgres_fdw extension
-- as it may be used by other features
