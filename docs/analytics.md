# Pipeline Analytics PostgreSQL — Triggers & Foreign Data Wrapper

## Objectif

- Permettre aux data-analystes d'exploiter les donnees Sirena via Metabase
- Alimentation en temps reel via des triggers PostgreSQL (pas de workers applicatifs)
- Base de donnees analytics separee avec schema en etoile (star schema)
- Donnees personnelles supprimees ou generalisees
- Zero code applicatif : toute la logique vit dans PostgreSQL

## Architecture

La synchronisation repose entierement sur PostgreSQL :

1. **Triggers** sur la base source Sirena detectent les INSERT/UPDATE/DELETE
2. **`postgres_fdw`** (Foreign Data Wrapper) permet aux triggers d'ecrire directement dans la base analytics distante
3. La base analytics expose un **schema en etoile** optimise pour Metabase

```
┌──────────────────────┐                        ┌──────────────────┐     ┌──────────┐
│     DB Sirena        │   postgres_fdw          │  DB Analytics    │◀────│ Metabase │
│  (source + triggers) │───────────────────────▶ │  (star schema)   │     │          │
│                      │   writes on each        │                  │     └──────────┘
│  triggers fire on    │   INSERT/UPDATE/DELETE   │  schema: star    │
│  every DML           │                         │  schema: sync    │
└──────────────────────┘                         └──────────────────┘
```

### Pourquoi cette approche ?

| Critere | BullMQ workers (avant) | PG triggers + FDW (maintenant) |
|---|---|---|
| Latence | 5 min (polling) | Temps reel (synchrone) |
| Composants | Redis + Node workers | PostgreSQL uniquement |
| Fiabilite | Depend du worker uptime | Transactionnel avec la source |
| Complexite ops | 3 services a surveiller | 0 service supplementaire |
| Rollback | Complexe | ROLLBACK natif PG |

### Limites et precautions

- Les triggers ajoutent de la latence aux ecritures source (le cout FDW est paye a chaque DML)
- Si la DB analytics est indisponible, les ecritures source echouent (couplage fort)
- Pour attenuer : configurer un `statement_timeout` sur le foreign server, et prevoir un circuit breaker via un flag dans `sync.sync_config`

## Schema en etoile (DB Analytics)

### Schema `star` — Tables de dimensions

| Table | Description | Colonnes cles |
|---|---|---|
| `dim_entite` | Entites (directions, services) | `id`, `nom_complet`, `label`, `entite_type`, `departement_code`, `region_code` |
| `dim_commune` | Communes et decoupage geo | `com_code`, `com_lib`, `dpt_code`, `dpt_lib`, `reg_code`, `reg_lib` |
| `dim_temps` | Dimension temporelle | `id` (YYYYMMDD), `jour`, `mois`, `annee`, `trimestre`, `jour_semaine` |
| `dim_motif` | Motifs de reclamation | `id`, `label` |
| `dim_motif_declaratif` | Motifs declaratifs | `id`, `label` |
| `dim_consequence` | Consequences constatees | `id`, `label` |
| `dim_maltraitance_type` | Types de maltraitance | `id`, `label` |
| `dim_mis_en_cause_type` | Types de mis en cause | `id`, `label` |
| `dim_lieu_type` | Types de lieu | `id`, `label` |
| `dim_reception_type` | Types de reception | `id`, `label` |
| `dim_provenance` | Provenance de la requete | `id`, `label` |
| `dim_statut_requete` | Statuts de requete | `id`, `label` |
| `dim_priorite` | Priorites | `id`, `label`, `sort_order` |
| `dim_etape_statut` | Statuts d'etape | `id`, `label` |
| `dim_cloture_reason` | Raisons de cloture | `id`, `label` |

### Schema `star` — Tables de faits

| Table | Description | FK dimensions |
|---|---|---|
| `fact_requete` | Table centrale des requetes | `dim_entite`, `dim_temps` (reception), `dim_reception_type`, `dim_provenance`, `dim_statut_requete`, `dim_priorite`, `dim_commune` (lieu), `dim_lieu_type`, `dim_mis_en_cause_type` |
| `fact_etape` | Etapes de traitement | `dim_entite`, `dim_temps` (creation), `dim_etape_statut`, `fact_requete` |

### Schema `star` — Tables de pont (N-N)

| Table | Description |
|---|---|
| `bridge_fait_motif` | Liaison fait / motifs |
| `bridge_fait_motif_declaratif` | Liaison fait / motifs declaratifs |
| `bridge_fait_consequence` | Liaison fait / consequences |
| `bridge_fait_maltraitance_type` | Liaison fait / types de maltraitance |

### Schema `sync` — Tables systeme

| Table | Description |
|---|---|
| `sync.sync_cursor` | Derniere position traitee par table |
| `sync.sync_log` | Journal des operations de sync (pour audit) |
| `sync.sync_config` | Configuration (ex: `enabled = true/false` pour circuit breaker) |

## PoC — Migration SQL

La migration ci-dessous est autonome. Elle cree :
1. Le schema `star` et le schema `sync` sur la base analytics
2. Les tables de dimensions, faits, ponts et systeme
3. Les foreign tables (via `postgres_fdw`) sur la base source pour ecrire dans la base analytics
4. Les fonctions trigger et les triggers eux-memes

### Fichier : `packages/db/prisma/analytics/001_star_schema_up.sql`

> A executer manuellement sur la **DB Analytics** (via `psql`), hors Prisma Migrate

```sql
-- ============================================================
-- STAR SCHEMA — DB Analytics
-- ============================================================

CREATE SCHEMA IF NOT EXISTS star;
CREATE SCHEMA IF NOT EXISTS sync;

-- -----------------------------------------------------------
-- DIMENSION: dim_temps (pre-remplie, pas de trigger)
-- -----------------------------------------------------------
CREATE TABLE star.dim_temps (
    id         INTEGER PRIMARY KEY, -- YYYYMMDD
    jour       SMALLINT NOT NULL,
    mois       SMALLINT NOT NULL,
    annee      SMALLINT NOT NULL,
    trimestre  SMALLINT NOT NULL,
    jour_semaine SMALLINT NOT NULL, -- 1=lundi ... 7=dimanche
    est_weekend BOOLEAN NOT NULL
);

-- Pre-remplir 10 ans (2020-2030)
INSERT INTO star.dim_temps (id, jour, mois, annee, trimestre, jour_semaine, est_weekend)
SELECT
    TO_CHAR(d, 'YYYYMMDD')::INTEGER,
    EXTRACT(DAY FROM d)::SMALLINT,
    EXTRACT(MONTH FROM d)::SMALLINT,
    EXTRACT(YEAR FROM d)::SMALLINT,
    EXTRACT(QUARTER FROM d)::SMALLINT,
    EXTRACT(ISODOW FROM d)::SMALLINT,
    EXTRACT(ISODOW FROM d)::SMALLINT IN (6, 7)
FROM generate_series('2020-01-01'::DATE, '2030-12-31'::DATE, '1 day') AS d
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------
-- DIMENSIONS: tables de reference (enum-like)
-- -----------------------------------------------------------
CREATE TABLE star.dim_entite (
    id               TEXT PRIMARY KEY,
    nom_complet      TEXT NOT NULL,
    label            TEXT NOT NULL,
    entite_type_id   TEXT,
    entite_type      TEXT,
    entite_mere_id   TEXT,
    departement_code TEXT,
    region_code      TEXT,
    region_lib       TEXT,
    departement_lib  TEXT,
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE star.dim_commune (
    com_code  TEXT PRIMARY KEY,
    com_lib   TEXT NOT NULL,
    dpt_code  TEXT NOT NULL,
    dpt_lib   TEXT NOT NULL,
    reg_code  TEXT NOT NULL,
    reg_lib   TEXT NOT NULL,
    ctcd_code TEXT,
    ctcd_lib  TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE star.dim_motif (
    id    TEXT PRIMARY KEY,
    label TEXT NOT NULL
);

CREATE TABLE star.dim_motif_declaratif (
    id    TEXT PRIMARY KEY,
    label TEXT NOT NULL
);

CREATE TABLE star.dim_consequence (
    id    TEXT PRIMARY KEY,
    label TEXT NOT NULL
);

CREATE TABLE star.dim_maltraitance_type (
    id    TEXT PRIMARY KEY,
    label TEXT NOT NULL
);

CREATE TABLE star.dim_mis_en_cause_type (
    id    TEXT PRIMARY KEY,
    label TEXT NOT NULL
);

CREATE TABLE star.dim_lieu_type (
    id    TEXT PRIMARY KEY,
    label TEXT NOT NULL
);

CREATE TABLE star.dim_reception_type (
    id    TEXT PRIMARY KEY,
    label TEXT NOT NULL
);

CREATE TABLE star.dim_provenance (
    id    TEXT PRIMARY KEY,
    label TEXT NOT NULL
);

CREATE TABLE star.dim_statut_requete (
    id    TEXT PRIMARY KEY,
    label TEXT NOT NULL
);

CREATE TABLE star.dim_priorite (
    id         TEXT PRIMARY KEY,
    label      TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE star.dim_etape_statut (
    id    TEXT PRIMARY KEY,
    label TEXT NOT NULL
);

CREATE TABLE star.dim_cloture_reason (
    id    TEXT PRIMARY KEY,
    label TEXT NOT NULL
);

-- -----------------------------------------------------------
-- FACT TABLES
-- -----------------------------------------------------------
CREATE TABLE star.fact_requete (
    requete_id          TEXT NOT NULL,
    entite_id           TEXT NOT NULL,
    -- dimensions
    temps_reception_id  INTEGER,       -- FK dim_temps
    reception_type_id   TEXT,          -- FK dim_reception_type
    provenance_id       TEXT,          -- FK dim_provenance
    statut_id           TEXT NOT NULL, -- FK dim_statut_requete
    priorite_id         TEXT,          -- FK dim_priorite
    -- lieu (denormalise depuis Situation > LieuDeSurvenue)
    lieu_type_id        TEXT,          -- FK dim_lieu_type
    lieu_commune_code   TEXT,          -- FK dim_commune (via code postal)
    -- mis en cause (denormalise)
    mis_en_cause_type_id TEXT,         -- FK dim_mis_en_cause_type
    -- fait dates
    fait_date_debut_id  INTEGER,       -- FK dim_temps
    fait_date_fin_id    INTEGER,       -- FK dim_temps
    -- mesures
    nb_etapes           INTEGER NOT NULL DEFAULT 0,
    nb_situations       INTEGER NOT NULL DEFAULT 0,
    -- anonymise : pas de declarant/participant/commentaire
    -- meta
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (requete_id, entite_id)
);

CREATE INDEX idx_fact_requete_temps ON star.fact_requete (temps_reception_id);
CREATE INDEX idx_fact_requete_entite ON star.fact_requete (entite_id);
CREATE INDEX idx_fact_requete_statut ON star.fact_requete (statut_id);

CREATE TABLE star.fact_etape (
    id              TEXT PRIMARY KEY,
    requete_id      TEXT NOT NULL,
    entite_id       TEXT NOT NULL,
    nom             TEXT NOT NULL,
    est_partagee    BOOLEAN NOT NULL DEFAULT FALSE,
    statut_id       TEXT NOT NULL,    -- FK dim_etape_statut
    temps_creation_id INTEGER,        -- FK dim_temps
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fact_etape_requete ON star.fact_etape (requete_id, entite_id);

-- -----------------------------------------------------------
-- BRIDGE TABLES (N-N)
-- -----------------------------------------------------------
CREATE TABLE star.bridge_fait_motif (
    situation_id TEXT NOT NULL,
    motif_id     TEXT NOT NULL REFERENCES star.dim_motif(id),
    PRIMARY KEY (situation_id, motif_id)
);

CREATE TABLE star.bridge_fait_motif_declaratif (
    situation_id        TEXT NOT NULL,
    motif_declaratif_id TEXT NOT NULL REFERENCES star.dim_motif_declaratif(id),
    PRIMARY KEY (situation_id, motif_declaratif_id)
);

CREATE TABLE star.bridge_fait_consequence (
    situation_id   TEXT NOT NULL,
    consequence_id TEXT NOT NULL REFERENCES star.dim_consequence(id),
    PRIMARY KEY (situation_id, consequence_id)
);

CREATE TABLE star.bridge_fait_maltraitance_type (
    situation_id       TEXT NOT NULL,
    maltraitance_type_id TEXT NOT NULL REFERENCES star.dim_maltraitance_type(id),
    PRIMARY KEY (situation_id, maltraitance_type_id)
);

-- -----------------------------------------------------------
-- SYNC TABLES
-- -----------------------------------------------------------
CREATE TABLE sync.sync_cursor (
    table_name   TEXT PRIMARY KEY,
    last_synced  TIMESTAMPTZ NOT NULL DEFAULT '1970-01-01',
    row_count    BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE sync.sync_log (
    id          BIGSERIAL PRIMARY KEY,
    table_name  TEXT NOT NULL,
    operation   TEXT NOT NULL, -- INSERT, UPDATE, DELETE
    source_id   TEXT NOT NULL,
    synced_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sync_log_table ON sync.sync_log (table_name, synced_at);

CREATE TABLE sync.sync_config (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

INSERT INTO sync.sync_config (key, value) VALUES
    ('enabled', 'true'),
    ('statement_timeout_ms', '5000')
ON CONFLICT (key) DO NOTHING;
```

### Fichier : `packages/db/prisma/migrations/20260401000001_analytics_fdw_and_triggers/migration.sql`

> Prisma Migrate — executee automatiquement sur la **DB Sirena (source)**

```sql
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
```

### Fichier : `packages/db/prisma/migrations/20260401000002_analytics_initial_backfill/migration.sql`

> Prisma Migrate — executee automatiquement sur la **DB Sirena** apres les triggers, pour remplir l'historique

```sql
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
```

## Rollback

Chaque migration a un fichier `down.sql` associe. L'ordre de rollback est inverse :

```bash
# 1. Vider les donnees backfill (sur DB source, via FDW)
psql $DATABASE_URL -f packages/db/prisma/migrations/20260401000002_analytics_initial_backfill/down.sql

# 2. Supprimer triggers + FDW (sur DB source)
psql $DATABASE_URL -f packages/db/prisma/migrations/20260401000001_analytics_fdw_and_triggers/down.sql

# 3. Supprimer le star schema (sur DB analytics)
psql $ANALYTICS_DATABASE_URL -f packages/db/prisma/analytics/001_star_schema_down.sql
```

## Operations

### Activer / desactiver la sync (circuit breaker)

```sql
-- Sur la DB source, via les foreign tables :
UPDATE analytics_fdw.sync_config SET value = 'false' WHERE key = 'enabled';
-- Reactiver :
UPDATE analytics_fdw.sync_config SET value = 'true' WHERE key = 'enabled';
```

### Re-backfill complet

1. Desactiver la sync : `UPDATE analytics_fdw.sync_config SET value = 'false' WHERE key = 'enabled';`
2. Truncate les tables analytics : `TRUNCATE star.fact_requete, star.fact_etape, ... CASCADE;`
3. Relancer `003_initial_backfill.sql`
4. Reactiver la sync

### Monitoring

```sql
-- Derniers evenements de sync
SELECT * FROM sync.sync_log ORDER BY synced_at DESC LIMIT 50;

-- Etat des curseurs
SELECT * FROM sync.sync_cursor ORDER BY table_name;

-- Verifier le drift (count source vs analytics)
SELECT
    'RequeteEntite' AS source_table,
    (SELECT COUNT(*) FROM "RequeteEntite") AS source_count,
    (SELECT COUNT(*) FROM analytics_fdw.fact_requete) AS analytics_count;
```

## Configuration

| Variable | Description | Defaut |
|---|---|---|
| `ANALYTICS_HOST` | Hote de la DB analytics | — |
| `ANALYTICS_PORT` | Port de la DB analytics | `5432` |
| `ANALYTICS_DBNAME` | Nom de la DB analytics | — |
| `ANALYTICS_USER` | Utilisateur pour la connexion FDW | — |
| `ANALYTICS_PASSWORD` | Mot de passe pour la connexion FDW | — |

## Securite

- L'utilisateur FDW ne doit avoir que les droits `INSERT`, `UPDATE`, `DELETE`, `SELECT` sur les schemas `star` et `sync` de la DB analytics
- Aucune donnee personnelle (nom, prenom, email, adresse, telephone) n'est envoyee vers la DB analytics
- Les triggers n'accedent jamais aux tables `Identite`, `Adresse`, `PersonneConcernee` pour extraire des PII
- Les commentaires libres sont exclus du schema analytics
