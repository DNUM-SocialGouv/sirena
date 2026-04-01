-- ============================================================
-- FOREIGN DATA WRAPPER + TRIGGERS — DB Source (Sirena)
-- ============================================================
-- Prerequis : l'extension postgres_fdw doit etre disponible
-- Les variables ${ANALYTICS_*} sont a remplacer par les vraies valeurs
-- ou a passer via psql -v

CREATE EXTENSION IF NOT EXISTS postgres_fdw;

-- -----------------------------------------------------------
-- 1. Foreign server vers la DB analytics
-- -----------------------------------------------------------
DROP SERVER IF EXISTS analytics_server CASCADE;

CREATE SERVER analytics_server
    FOREIGN DATA WRAPPER postgres_fdw
    OPTIONS (
        host     :'ANALYTICS_HOST',
        port     :'ANALYTICS_PORT',
        dbname   :'ANALYTICS_DBNAME',
        -- timeout pour eviter de bloquer les ecritures source
        connect_timeout '5',
        keepalives '1',
        keepalives_idle '30'
    );

CREATE USER MAPPING FOR CURRENT_USER
    SERVER analytics_server
    OPTIONS (
        user     :'ANALYTICS_USER',
        password :'ANALYTICS_PASSWORD'
    );

-- -----------------------------------------------------------
-- 2. Schema local pour les foreign tables
-- -----------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS analytics_fdw;

-- Import du schema star depuis la DB analytics
IMPORT FOREIGN SCHEMA star
    FROM SERVER analytics_server
    INTO analytics_fdw;

-- Import du schema sync
IMPORT FOREIGN SCHEMA sync
    FROM SERVER analytics_server
    INTO analytics_fdw;

-- -----------------------------------------------------------
-- 3. Helper : check si la sync est activee
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION analytics_fdw.is_sync_enabled()
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE AS $$
DECLARE
    v_enabled TEXT;
BEGIN
    SELECT value INTO v_enabled
    FROM analytics_fdw.sync_config
    WHERE key = 'enabled';

    RETURN COALESCE(v_enabled, 'false') = 'true';
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

-- -----------------------------------------------------------
-- 4. Helper : log sync operation
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION analytics_fdw.log_sync(
    p_table TEXT,
    p_operation TEXT,
    p_source_id TEXT
) RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO analytics_fdw.sync_log (table_name, operation, source_id)
    VALUES (p_table, p_operation, p_source_id);
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'analytics sync log failed: %', SQLERRM;
END;
$$;

-- -----------------------------------------------------------
-- 5. TRIGGERS : Dimensions enum (simple upsert pattern)
-- -----------------------------------------------------------

-- Generic trigger for simple enum tables (id, label)
CREATE OR REPLACE FUNCTION trg_sync_dim_enum()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
    v_target TEXT;
BEGIN
    IF NOT analytics_fdw.is_sync_enabled() THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Map source table to analytics dimension table
    v_target := CASE TG_TABLE_NAME
        WHEN 'MotifEnum'            THEN 'dim_motif'
        WHEN 'MotifDeclaratifEnum'  THEN 'dim_motif_declaratif'
        WHEN 'ConsequenceEnum'      THEN 'dim_consequence'
        WHEN 'MaltraitanceTypeEnum' THEN 'dim_maltraitance_type'
        WHEN 'MisEnCauseTypeEnum'   THEN 'dim_mis_en_cause_type'
        WHEN 'LieuTypeEnum'        THEN 'dim_lieu_type'
        WHEN 'ReceptionTypeEnum'   THEN 'dim_reception_type'
        WHEN 'RequeteProvenanceEnum' THEN 'dim_provenance'
        WHEN 'RequeteStatusEnum'   THEN 'dim_statut_requete'
        WHEN 'RequeteEtapeStatutEnum' THEN 'dim_etape_statut'
        WHEN 'RequeteClotureReasonEnum' THEN 'dim_cloture_reason'
    END;

    IF v_target IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    IF TG_OP = 'DELETE' THEN
        EXECUTE format(
            'DELETE FROM analytics_fdw.%I WHERE id = $1', v_target
        ) USING OLD.id;
        PERFORM analytics_fdw.log_sync(v_target, 'DELETE', OLD.id);
        RETURN OLD;
    END IF;

    -- UPSERT
    EXECUTE format(
        'INSERT INTO analytics_fdw.%I (id, label) VALUES ($1, $2)
         ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label',
        v_target
    ) USING NEW.id, NEW.label;

    PERFORM analytics_fdw.log_sync(v_target, TG_OP, NEW.id);
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'analytics sync % failed for %: %', v_target, TG_OP, SQLERRM;
        RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attach to all enum tables
CREATE TRIGGER trg_analytics_motif
    AFTER INSERT OR UPDATE OR DELETE ON "MotifEnum"
    FOR EACH ROW EXECUTE FUNCTION trg_sync_dim_enum();

CREATE TRIGGER trg_analytics_motif_declaratif
    AFTER INSERT OR UPDATE OR DELETE ON "MotifDeclaratifEnum"
    FOR EACH ROW EXECUTE FUNCTION trg_sync_dim_enum();

CREATE TRIGGER trg_analytics_consequence
    AFTER INSERT OR UPDATE OR DELETE ON "ConsequenceEnum"
    FOR EACH ROW EXECUTE FUNCTION trg_sync_dim_enum();

CREATE TRIGGER trg_analytics_maltraitance_type
    AFTER INSERT OR UPDATE OR DELETE ON "MaltraitanceTypeEnum"
    FOR EACH ROW EXECUTE FUNCTION trg_sync_dim_enum();

CREATE TRIGGER trg_analytics_mis_en_cause_type
    AFTER INSERT OR UPDATE OR DELETE ON "MisEnCauseTypeEnum"
    FOR EACH ROW EXECUTE FUNCTION trg_sync_dim_enum();

CREATE TRIGGER trg_analytics_lieu_type
    AFTER INSERT OR UPDATE OR DELETE ON "LieuTypeEnum"
    FOR EACH ROW EXECUTE FUNCTION trg_sync_dim_enum();

CREATE TRIGGER trg_analytics_reception_type
    AFTER INSERT OR UPDATE OR DELETE ON "ReceptionTypeEnum"
    FOR EACH ROW EXECUTE FUNCTION trg_sync_dim_enum();

CREATE TRIGGER trg_analytics_provenance
    AFTER INSERT OR UPDATE OR DELETE ON "RequeteProvenanceEnum"
    FOR EACH ROW EXECUTE FUNCTION trg_sync_dim_enum();

CREATE TRIGGER trg_analytics_statut_requete
    AFTER INSERT OR UPDATE OR DELETE ON "RequeteStatusEnum"
    FOR EACH ROW EXECUTE FUNCTION trg_sync_dim_enum();

CREATE TRIGGER trg_analytics_etape_statut
    AFTER INSERT OR UPDATE OR DELETE ON "RequeteEtapeStatutEnum"
    FOR EACH ROW EXECUTE FUNCTION trg_sync_dim_enum();

CREATE TRIGGER trg_analytics_cloture_reason
    AFTER INSERT OR UPDATE OR DELETE ON "RequeteClotureReasonEnum"
    FOR EACH ROW EXECUTE FUNCTION trg_sync_dim_enum();

-- -----------------------------------------------------------
-- 6. TRIGGER : dim_priorite (has sort_order)
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_sync_dim_priorite()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    IF NOT analytics_fdw.is_sync_enabled() THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    IF TG_OP = 'DELETE' THEN
        DELETE FROM analytics_fdw.dim_priorite WHERE id = OLD.id;
        PERFORM analytics_fdw.log_sync('dim_priorite', 'DELETE', OLD.id);
        RETURN OLD;
    END IF;

    INSERT INTO analytics_fdw.dim_priorite (id, label, sort_order)
    VALUES (NEW.id, NEW.label, NEW."sortOrder")
    ON CONFLICT (id) DO UPDATE SET
        label = EXCLUDED.label,
        sort_order = EXCLUDED.sort_order;

    PERFORM analytics_fdw.log_sync('dim_priorite', TG_OP, NEW.id);
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'analytics sync dim_priorite failed: %', SQLERRM;
        RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_analytics_priorite
    AFTER INSERT OR UPDATE OR DELETE ON "RequetePrioriteEnum"
    FOR EACH ROW EXECUTE FUNCTION trg_sync_dim_priorite();

-- -----------------------------------------------------------
-- 7. TRIGGER : dim_entite
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_sync_dim_entite()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
    v_entite_type TEXT;
BEGIN
    IF NOT analytics_fdw.is_sync_enabled() THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    IF TG_OP = 'DELETE' THEN
        DELETE FROM analytics_fdw.dim_entite WHERE id = OLD.id;
        PERFORM analytics_fdw.log_sync('dim_entite', 'DELETE', OLD.id);
        RETURN OLD;
    END IF;

    -- Resolve entite type label
    SELECT label INTO v_entite_type
    FROM "EntiteTypeEnum"
    WHERE id = NEW."entiteTypeId";

    INSERT INTO analytics_fdw.dim_entite (
        id, nom_complet, label, entite_type_id, entite_type,
        entite_mere_id, departement_code, region_code,
        region_lib, departement_lib, is_active, updated_at
    ) VALUES (
        NEW.id, NEW."nomComplet", NEW.label, NEW."entiteTypeId", v_entite_type,
        NEW."entiteMereId", NEW."departementCode", NEW."regionCode",
        NEW."regLib", NEW."dptLib", NEW."isActive", NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        nom_complet      = EXCLUDED.nom_complet,
        label            = EXCLUDED.label,
        entite_type_id   = EXCLUDED.entite_type_id,
        entite_type      = EXCLUDED.entite_type,
        entite_mere_id   = EXCLUDED.entite_mere_id,
        departement_code = EXCLUDED.departement_code,
        region_code      = EXCLUDED.region_code,
        region_lib       = EXCLUDED.region_lib,
        departement_lib  = EXCLUDED.departement_lib,
        is_active        = EXCLUDED.is_active,
        updated_at       = NOW();

    PERFORM analytics_fdw.log_sync('dim_entite', TG_OP, NEW.id);
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'analytics sync dim_entite failed: %', SQLERRM;
        RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_analytics_entite
    AFTER INSERT OR UPDATE OR DELETE ON "Entite"
    FOR EACH ROW EXECUTE FUNCTION trg_sync_dim_entite();

-- -----------------------------------------------------------
-- 8. TRIGGER : dim_commune
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_sync_dim_commune()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    IF NOT analytics_fdw.is_sync_enabled() THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    IF TG_OP = 'DELETE' THEN
        DELETE FROM analytics_fdw.dim_commune WHERE com_code = OLD."comCode";
        PERFORM analytics_fdw.log_sync('dim_commune', 'DELETE', OLD."comCode");
        RETURN OLD;
    END IF;

    INSERT INTO analytics_fdw.dim_commune (
        com_code, com_lib, dpt_code, dpt_lib,
        reg_code, reg_lib, ctcd_code, ctcd_lib, updated_at
    ) VALUES (
        NEW."comCode", NEW."comLib",
        NEW."dptCodeActuel", NEW."dptLibActuel",
        NEW."regCodeActuel", NEW."regLibActuel",
        NEW."ctcdCodeActuel", NEW."ctcdLibActuel",
        NOW()
    )
    ON CONFLICT (com_code) DO UPDATE SET
        com_lib   = EXCLUDED.com_lib,
        dpt_code  = EXCLUDED.dpt_code,
        dpt_lib   = EXCLUDED.dpt_lib,
        reg_code  = EXCLUDED.reg_code,
        reg_lib   = EXCLUDED.reg_lib,
        ctcd_code = EXCLUDED.ctcd_code,
        ctcd_lib  = EXCLUDED.ctcd_lib,
        updated_at = NOW();

    PERFORM analytics_fdw.log_sync('dim_commune', TG_OP, NEW."comCode");
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'analytics sync dim_commune failed: %', SQLERRM;
        RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_analytics_commune
    AFTER INSERT OR UPDATE OR DELETE ON "Commune"
    FOR EACH ROW EXECUTE FUNCTION trg_sync_dim_commune();

-- -----------------------------------------------------------
-- 9. TRIGGER : fact_requete (via RequeteEntite)
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_sync_fact_requete()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
    v_rec RECORD;
    v_temps_reception INTEGER;
    v_lieu_type_id TEXT;
    v_lieu_cp TEXT;
    v_commune_code TEXT;
    v_mec_type_id TEXT;
    v_fait_debut_id INTEGER;
    v_fait_fin_id INTEGER;
    v_nb_etapes INTEGER;
    v_nb_situations INTEGER;
BEGIN
    IF NOT analytics_fdw.is_sync_enabled() THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    IF TG_OP = 'DELETE' THEN
        DELETE FROM analytics_fdw.fact_requete
        WHERE requete_id = OLD."requeteId" AND entite_id = OLD."entiteId";
        PERFORM analytics_fdw.log_sync('fact_requete', 'DELETE', OLD."requeteId" || '/' || OLD."entiteId");
        RETURN OLD;
    END IF;

    -- Fetch requete data
    SELECT * INTO v_rec FROM "Requete" WHERE id = NEW."requeteId";

    -- Compute dim_temps key from receptionDate
    IF v_rec."receptionDate" IS NOT NULL THEN
        v_temps_reception := TO_CHAR(v_rec."receptionDate", 'YYYYMMDD')::INTEGER;
    END IF;

    -- Resolve lieu info from first situation
    SELECT
        lds."lieuTypeId", lds."codePostal"
    INTO v_lieu_type_id, v_lieu_cp
    FROM "Situation" s
    JOIN "LieuDeSurvenue" lds ON lds.id = s."lieuDeSurvenueId"
    WHERE s."requeteId" = NEW."requeteId"
    LIMIT 1;

    -- Resolve commune from lieu code postal
    IF v_lieu_cp IS NOT NULL AND v_lieu_cp != '' THEN
        SELECT ip."codeInsee" INTO v_commune_code
        FROM "InseePostal" ip
        WHERE ip."codePostal" = v_lieu_cp
        LIMIT 1;
    END IF;

    -- Resolve mis en cause type from first situation
    SELECT mc."misEnCauseTypeId" INTO v_mec_type_id
    FROM "Situation" s
    JOIN "MisEnCause" mc ON mc.id = s."misEnCauseId"
    WHERE s."requeteId" = NEW."requeteId"
    LIMIT 1;

    -- Fait dates from first situation
    SELECT
        CASE WHEN f."dateDebut" IS NOT NULL
            THEN TO_CHAR(f."dateDebut", 'YYYYMMDD')::INTEGER END,
        CASE WHEN f."dateFin" IS NOT NULL
            THEN TO_CHAR(f."dateFin", 'YYYYMMDD')::INTEGER END
    INTO v_fait_debut_id, v_fait_fin_id
    FROM "Situation" s
    JOIN "Fait" f ON f."situationId" = s.id
    WHERE s."requeteId" = NEW."requeteId"
    LIMIT 1;

    -- Counts
    SELECT COUNT(*) INTO v_nb_etapes
    FROM "RequeteEtape"
    WHERE "requeteId" = NEW."requeteId" AND "entiteId" = NEW."entiteId";

    SELECT COUNT(*) INTO v_nb_situations
    FROM "Situation"
    WHERE "requeteId" = NEW."requeteId";

    -- Upsert
    INSERT INTO analytics_fdw.fact_requete (
        requete_id, entite_id, temps_reception_id,
        reception_type_id, provenance_id, statut_id, priorite_id,
        lieu_type_id, lieu_commune_code, mis_en_cause_type_id,
        fait_date_debut_id, fait_date_fin_id,
        nb_etapes, nb_situations,
        created_at, updated_at
    ) VALUES (
        NEW."requeteId", NEW."entiteId", v_temps_reception,
        v_rec."receptionTypeId", v_rec."provenanceId", NEW."statutId", NEW."prioriteId",
        v_lieu_type_id, v_commune_code, v_mec_type_id,
        v_fait_debut_id, v_fait_fin_id,
        v_nb_etapes, v_nb_situations,
        v_rec."createdAt", NOW()
    )
    ON CONFLICT (requete_id, entite_id) DO UPDATE SET
        temps_reception_id   = EXCLUDED.temps_reception_id,
        reception_type_id    = EXCLUDED.reception_type_id,
        provenance_id        = EXCLUDED.provenance_id,
        statut_id            = EXCLUDED.statut_id,
        priorite_id          = EXCLUDED.priorite_id,
        lieu_type_id         = EXCLUDED.lieu_type_id,
        lieu_commune_code    = EXCLUDED.lieu_commune_code,
        mis_en_cause_type_id = EXCLUDED.mis_en_cause_type_id,
        fait_date_debut_id   = EXCLUDED.fait_date_debut_id,
        fait_date_fin_id     = EXCLUDED.fait_date_fin_id,
        nb_etapes            = EXCLUDED.nb_etapes,
        nb_situations        = EXCLUDED.nb_situations,
        updated_at           = NOW();

    PERFORM analytics_fdw.log_sync('fact_requete', TG_OP, NEW."requeteId" || '/' || NEW."entiteId");
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'analytics sync fact_requete failed: %', SQLERRM;
        RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_analytics_fact_requete
    AFTER INSERT OR UPDATE OR DELETE ON "RequeteEntite"
    FOR EACH ROW EXECUTE FUNCTION trg_sync_fact_requete();

-- -----------------------------------------------------------
-- 10. TRIGGER : fact_etape
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_sync_fact_etape()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
    v_temps_creation INTEGER;
BEGIN
    IF NOT analytics_fdw.is_sync_enabled() THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    IF TG_OP = 'DELETE' THEN
        DELETE FROM analytics_fdw.fact_etape WHERE id = OLD.id;
        PERFORM analytics_fdw.log_sync('fact_etape', 'DELETE', OLD.id);
        RETURN OLD;
    END IF;

    v_temps_creation := TO_CHAR(NEW."createdAt", 'YYYYMMDD')::INTEGER;

    INSERT INTO analytics_fdw.fact_etape (
        id, requete_id, entite_id, nom, est_partagee,
        statut_id, temps_creation_id, created_at, updated_at
    ) VALUES (
        NEW.id, NEW."requeteId", NEW."entiteId", NEW.nom, NEW."estPartagee",
        NEW."statutId", v_temps_creation, NEW."createdAt", NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        nom              = EXCLUDED.nom,
        est_partagee     = EXCLUDED.est_partagee,
        statut_id        = EXCLUDED.statut_id,
        temps_creation_id = EXCLUDED.temps_creation_id,
        updated_at       = NOW();

    PERFORM analytics_fdw.log_sync('fact_etape', TG_OP, NEW.id);
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'analytics sync fact_etape failed: %', SQLERRM;
        RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_analytics_fact_etape
    AFTER INSERT OR UPDATE OR DELETE ON "RequeteEtape"
    FOR EACH ROW EXECUTE FUNCTION trg_sync_fact_etape();

-- -----------------------------------------------------------
-- 11. TRIGGERS : Bridge tables (N-N)
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_sync_bridge_fait_motif()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    IF NOT analytics_fdw.is_sync_enabled() THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    IF TG_OP = 'DELETE' THEN
        DELETE FROM analytics_fdw.bridge_fait_motif
        WHERE situation_id = OLD."situationId" AND motif_id = OLD."motifId";
        RETURN OLD;
    END IF;

    INSERT INTO analytics_fdw.bridge_fait_motif (situation_id, motif_id)
    VALUES (NEW."situationId", NEW."motifId")
    ON CONFLICT DO NOTHING;
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'analytics sync bridge_fait_motif failed: %', SQLERRM;
        RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_analytics_bridge_fait_motif
    AFTER INSERT OR DELETE ON "FaitMotif"
    FOR EACH ROW EXECUTE FUNCTION trg_sync_bridge_fait_motif();

-- FaitMotifDeclaratif
CREATE OR REPLACE FUNCTION trg_sync_bridge_fait_motif_declaratif()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    IF NOT analytics_fdw.is_sync_enabled() THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    IF TG_OP = 'DELETE' THEN
        DELETE FROM analytics_fdw.bridge_fait_motif_declaratif
        WHERE situation_id = OLD."situationId" AND motif_declaratif_id = OLD."motifDeclaratifId";
        RETURN OLD;
    END IF;

    INSERT INTO analytics_fdw.bridge_fait_motif_declaratif (situation_id, motif_declaratif_id)
    VALUES (NEW."situationId", NEW."motifDeclaratifId")
    ON CONFLICT DO NOTHING;
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'analytics sync bridge_fait_motif_declaratif failed: %', SQLERRM;
        RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_analytics_bridge_fait_motif_declaratif
    AFTER INSERT OR DELETE ON "FaitMotifDeclaratif"
    FOR EACH ROW EXECUTE FUNCTION trg_sync_bridge_fait_motif_declaratif();

-- FaitConsequence
CREATE OR REPLACE FUNCTION trg_sync_bridge_fait_consequence()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    IF NOT analytics_fdw.is_sync_enabled() THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    IF TG_OP = 'DELETE' THEN
        DELETE FROM analytics_fdw.bridge_fait_consequence
        WHERE situation_id = OLD."situationId" AND consequence_id = OLD."consequenceId";
        RETURN OLD;
    END IF;

    INSERT INTO analytics_fdw.bridge_fait_consequence (situation_id, consequence_id)
    VALUES (NEW."situationId", NEW."consequenceId")
    ON CONFLICT DO NOTHING;
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'analytics sync bridge_fait_consequence failed: %', SQLERRM;
        RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_analytics_bridge_fait_consequence
    AFTER INSERT OR DELETE ON "FaitConsequence"
    FOR EACH ROW EXECUTE FUNCTION trg_sync_bridge_fait_consequence();

-- FaitMaltraitanceType
CREATE OR REPLACE FUNCTION trg_sync_bridge_fait_maltraitance()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    IF NOT analytics_fdw.is_sync_enabled() THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    IF TG_OP = 'DELETE' THEN
        DELETE FROM analytics_fdw.bridge_fait_maltraitance_type
        WHERE situation_id = OLD."situationId" AND maltraitance_type_id = OLD."maltraitanceTypeId";
        RETURN OLD;
    END IF;

    INSERT INTO analytics_fdw.bridge_fait_maltraitance_type (situation_id, maltraitance_type_id)
    VALUES (NEW."situationId", NEW."maltraitanceTypeId")
    ON CONFLICT DO NOTHING;
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'analytics sync bridge_fait_maltraitance failed: %', SQLERRM;
        RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_analytics_bridge_fait_maltraitance
    AFTER INSERT OR DELETE ON "FaitMaltraitanceType"
    FOR EACH ROW EXECUTE FUNCTION trg_sync_bridge_fait_maltraitance();
