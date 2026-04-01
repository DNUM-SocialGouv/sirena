-- ============================================================
-- DOWN: BACKFILL — DB Source (Sirena)
-- Clears all data pushed to analytics via FDW
-- Requires the FDW schema (002) to still be in place
-- ============================================================

DELETE FROM analytics_fdw.bridge_fait_maltraitance_type;
DELETE FROM analytics_fdw.bridge_fait_consequence;
DELETE FROM analytics_fdw.bridge_fait_motif_declaratif;
DELETE FROM analytics_fdw.bridge_fait_motif;
DELETE FROM analytics_fdw.fact_etape;
DELETE FROM analytics_fdw.fact_requete;
DELETE FROM analytics_fdw.dim_commune;
DELETE FROM analytics_fdw.dim_entite;
DELETE FROM analytics_fdw.dim_priorite;
DELETE FROM analytics_fdw.dim_cloture_reason;
DELETE FROM analytics_fdw.dim_etape_statut;
DELETE FROM analytics_fdw.dim_statut_requete;
DELETE FROM analytics_fdw.dim_provenance;
DELETE FROM analytics_fdw.dim_reception_type;
DELETE FROM analytics_fdw.dim_lieu_type;
DELETE FROM analytics_fdw.dim_mis_en_cause_type;
DELETE FROM analytics_fdw.dim_maltraitance_type;
DELETE FROM analytics_fdw.dim_consequence;
DELETE FROM analytics_fdw.dim_motif_declaratif;
DELETE FROM analytics_fdw.dim_motif;
DELETE FROM analytics_fdw.sync_cursor;
