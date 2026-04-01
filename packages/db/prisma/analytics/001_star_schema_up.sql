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
