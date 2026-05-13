# Statistiques Signalements / Réclamations

Ce document décrit les requêtes SQL permettant de produire les statistiques de volumétrie des **signalements** et **réclamations**, ventilées par domaine (médico-social / sanitaire), catégorie de lieu / mis en cause, type d'entité traitante, région et type de requête (mode de réception).

## Définitions

| Notion | Critère SQL |
|---|---|
| Signalement | `PersonneConcernee.estSignalementProfessionnel IS TRUE` sur le déclarant (case « déclarant professionnel de santé EIG » cochée) |
| Réclamation | `PersonneConcernee.estSignalementProfessionnel IS NOT TRUE` (case décochée ou non renseignée, NULL inclus) |

La nuance sur les NULL est importante : un déclarant qui n'a jamais touché la case est `NULL` côté base, et doit être compté en **réclamation**.

### Catégories à produire

#### Signalements (nb de requêtes)

| Domaine | Catégorie | Règle |
|---|---|---|
| Médico-social | PA | Lieu de survenue = `ETABLISSEMENT_PERSONNES_AGEES` |
| Médico-social | PH | Lieu de survenue = `ETABLISSEMENT_HANDICAP` |
| Sanitaire | Établissement de santé | Lieu de survenue ∈ {`ETABLISSEMENT_SANTE`, `DOMICILE`} |
| Sanitaire | Médecine de ville | Mis en cause = `PROFESSIONNEL_SANTE` ET lieu ≠ `ETABLISSEMENT_SANTE` (souvent à 0) |

#### Réclamations (nb de requêtes)

| Domaine | Catégorie | Règle |
|---|---|---|
| Médico-social | PA | Lieu = `ETABLISSEMENT_PERSONNES_AGEES` ET aucun mis en cause `PROFESSIONNEL_SANTE` |
| Médico-social | PH | Lieu = `ETABLISSEMENT_HANDICAP` ET aucun mis en cause `PROFESSIONNEL_SANTE` |
| Sanitaire | Établissement de santé | Lieu ∈ {`ETABLISSEMENT_SANTE`, `DOMICILE`} ET mis en cause = `ETABLISSEMENT` |
| Sanitaire | Médecine de ville | Mis en cause = `PROFESSIONNEL_SANTE` |

## Hypothèses sur le modèle

- Une `Requete` peut comporter plusieurs `Situation` (chaque situation a son `LieuDeSurvenue` et son `MisEnCause`). Une requête peut donc relever de **plusieurs catégories** simultanément.
- Le décompte est fait sur des **requêtes distinctes** (`COUNT(DISTINCT requete_id)`), pas sur des situations.
- Une `Requete` est rattachée à 1..n `Entite` traitantes via `RequeteEntite`. Pour la dimension région / type d'entité, on remonte la chaîne `entiteMere` jusqu'à la racine (l'ARS ou autre entité racine porte `regionCode`/`regLib`).
- « Type de requête » est dérivé de `Requete.receptionTypeId` et réduit à 3 valeurs :
  - `DematSocial` — `receptionTypeId = 'FORMULAIRE'` (les imports DematSocial sont enregistrés avec ce type via `dematSocial.adapter.ts`)
  - `Plateforme téléphonique` — `receptionTypeId = 'PLATEFORME'`
  - `Manuel` — tout le reste (EMAIL, COURRIER, TELEPHONE, AUTRE, NULL)

## Requête unifiée (toutes ventilations)

Produit une ligne par (`entite_type`, `region`, `requete_type`, `domaine`, `catégorie`) avec le nombre de requêtes.

```sql
-- =========================================================================
-- entite_chain : remonte la chaîne entiteMere pour chaque Entite.
-- Une ARS racine porte regionCode/regLib ; ses services enfants (parfois sur
-- 2 niveaux) ne les portent pas. On itère jusqu'à la racine pour récupérer
-- la région via la mère. Marche aussi pour les autres types (CD, DD…).
-- =========================================================================
WITH RECURSIVE entite_chain AS (
  -- Cas de base : chaque Entite, profondeur 0
  SELECT e.id AS entite_id, e.id AS current_id, e."entiteMereId" AS parent_id,
         e."entiteTypeId" AS current_type, e."regionCode" AS region_code,
         e."regLib" AS region_lib, 0 AS depth
  FROM "Entite" e
  UNION ALL
  -- Itération : on remonte d'un niveau vers la mère
  SELECT ec.entite_id, parent.id, parent."entiteMereId", parent."entiteTypeId",
         parent."regionCode", parent."regLib", ec.depth + 1
  FROM entite_chain ec
  JOIN "Entite" parent ON parent.id = ec.parent_id
  WHERE ec.depth < 5   -- garde-fou anti-cycle (en pratique 2 niveaux max)
),

-- =========================================================================
-- entite_to_racine : pour chaque Entite, on garde uniquement la racine
-- (parent_id IS NULL). C'est elle qui porte le type pertinent (ARS, CD…)
-- et la région. DISTINCT ON + ORDER BY depth DESC = la racine atteinte
-- au bout du chemin le plus long.
-- =========================================================================
entite_to_racine AS (
  SELECT DISTINCT ON (entite_id)
    entite_id, current_id AS racine_id, current_type AS racine_type,
    region_code, region_lib
  FROM entite_chain
  WHERE parent_id IS NULL
  ORDER BY entite_id, depth DESC
),

-- =========================================================================
-- per_requete : 1 ligne par Requete, agrège ses Situations en flags
-- booléens (présence d'un lieu ou d'un mis en cause donné). On utilise
-- BOOL_OR car une requête peut avoir N situations et il suffit qu'une
-- seule satisfasse le critère.
--
-- requete_type est dérivé de receptionTypeId selon la règle métier :
--   - DematSocial             si receptionTypeId = 'FORMULAIRE'
--     (les imports DematSocial sont enregistrés avec ce type)
--   - Plateforme téléphonique si receptionTypeId = 'PLATEFORME'
--   - Manuel                  pour tout le reste (EMAIL, COURRIER,
--     TELEPHONE, AUTRE, NULL)
-- =========================================================================
per_requete AS (
  SELECT
    r.id AS requete_id,
    -- Déclarant pro de santé EIG : NULL traité comme "non coché" (cf. règle réclamation)
    pc."estSignalementProfessionnel" AS est_signalement_pro,
    CASE r."receptionTypeId"
      WHEN 'FORMULAIRE' THEN 'DematSocial'
      WHEN 'PLATEFORME' THEN 'Plateforme téléphonique'
      ELSE                   'Manuel'
    END AS requete_type,
    -- Présence d'un lieu de survenue par type (au moins une situation)
    BOOL_OR(lds."lieuTypeId" = 'ETABLISSEMENT_PERSONNES_AGEES') AS has_pa,
    BOOL_OR(lds."lieuTypeId" = 'ETABLISSEMENT_HANDICAP')         AS has_ph,
    BOOL_OR(lds."lieuTypeId" = 'ETABLISSEMENT_SANTE')             AS has_es,
    BOOL_OR(lds."lieuTypeId" = 'DOMICILE')                        AS has_domicile,
    -- Présence d'un mis en cause d'un type donné
    BOOL_OR(mec."misEnCauseTypeId" = 'PROFESSIONNEL_SANTE')       AS has_mec_prof_sante,
    BOOL_OR(mec."misEnCauseTypeId" = 'ETABLISSEMENT')             AS has_mec_etab,
    -- Médecine de ville : pro de santé mis en cause ET lieu ≠ établissement de santé,
    -- évalué SUR LA MÊME situation (d'où la combinaison à l'intérieur du BOOL_OR)
    BOOL_OR(
      mec."misEnCauseTypeId" = 'PROFESSIONNEL_SANTE'
      AND lds."lieuTypeId" IS DISTINCT FROM 'ETABLISSEMENT_SANTE'
    ) AS has_med_ville
  FROM "Requete" r
  JOIN "PersonneConcernee" pc ON pc."declarantDeId" = r.id  -- déclarant uniquement
  LEFT JOIN "Situation"      s   ON s."requeteId"        = r.id
  LEFT JOIN "LieuDeSurvenue" lds ON lds.id               = s."lieuDeSurvenueId"
  LEFT JOIN "MisEnCause"     mec ON mec.id               = s."misEnCauseId"
  GROUP BY r.id, pc."estSignalementProfessionnel", r."receptionTypeId"
),

-- =========================================================================
-- requete_racine : associe chaque Requete à l'ensemble distinct des entités
-- RACINES (ARS/CD/...) qui la traitent, via RequeteEntite.
-- Si une requête est partagée entre 2 racines de régions différentes,
-- elle apparaîtra dans chaque région (double compte régional volontaire).
-- =========================================================================
requete_racine AS (
  SELECT DISTINCT re."requeteId", er.racine_type, er.region_code, er.region_lib
  FROM "RequeteEntite" re
  JOIN entite_to_racine er ON er.entite_id = re."entiteId"
),

-- =========================================================================
-- requete_categorie : dépivot par CROSS JOIN LATERAL (VALUES …).
-- Pour chaque requête, on évalue les 8 catégories métier ; la requête
-- apparaît dans toutes celles qui matchent (catégories NON exclusives).
--
-- Règles de NULL :
--   - Signalement = case déclarant EIG cochée  → IS TRUE
--   - Réclamation = case non cochée OU NULL    → IS NOT TRUE
--   - has_mec_prof_sante peut être NULL (aucune situation typée) ;
--     on veut alors inclure la requête en réclamation PA/PH → IS NOT TRUE
-- =========================================================================
requete_categorie AS (
  SELECT
    rr.racine_type AS entite_type,
    rr.region_code,
    rr.region_lib,
    p.requete_type,
    cats.type,
    cats.domaine,
    cats.categorie,
    p.requete_id
  FROM per_requete p
  JOIN requete_racine rr ON rr."requeteId" = p.requete_id
  CROSS JOIN LATERAL (VALUES
    -- ---------- Signalements (déclarant pro de santé EIG = coché) ----------
    ('Signalement', 'Médico-social', 'PA',
       p.est_signalement_pro IS TRUE  AND p.has_pa IS TRUE),
    ('Signalement', 'Médico-social', 'PH',
       p.est_signalement_pro IS TRUE  AND p.has_ph IS TRUE),
    -- Sanitaire ES : on inclut le domicile selon la règle métier
    ('Signalement', 'Sanitaire',     'Établissement de santé',
       p.est_signalement_pro IS TRUE  AND (p.has_es IS TRUE OR p.has_domicile IS TRUE)),
    -- Médecine de ville : souvent à 0 (cas extrême, vérifier en production)
    ('Signalement', 'Sanitaire',     'Médecine de ville',
       p.est_signalement_pro IS TRUE  AND p.has_med_ville IS TRUE),

    -- ---------- Réclamations (déclarant pro de santé EIG = NON coché) ----------
    -- PA/PH : on exclut les requêtes où un pro de santé est mis en cause
    ('Réclamation', 'Médico-social', 'PA',
       p.est_signalement_pro IS NOT TRUE AND p.has_pa IS TRUE AND p.has_mec_prof_sante IS NOT TRUE),
    ('Réclamation', 'Médico-social', 'PH',
       p.est_signalement_pro IS NOT TRUE AND p.has_ph IS TRUE AND p.has_mec_prof_sante IS NOT TRUE),
    -- Sanitaire ES : mis en cause de type établissement (label en base : "Un établissement ou un service")
    ('Réclamation', 'Sanitaire',     'Établissement de santé',
       p.est_signalement_pro IS NOT TRUE AND (p.has_es IS TRUE OR p.has_domicile IS TRUE) AND p.has_mec_etab IS TRUE),
    -- Médecine de ville : pro de santé mis en cause, quel que soit le lieu
    ('Réclamation', 'Sanitaire',     'Médecine de ville',
       p.est_signalement_pro IS NOT TRUE AND p.has_mec_prof_sante IS TRUE)
  ) AS cats(type, domaine, categorie, matches)
  WHERE cats.matches   -- ne garde que les catégories effectivement applicables
)

-- =========================================================================
-- Agrégation finale : 1 ligne par tuple (entite_type, région, requete_type,
-- type, domaine, catégorie), avec le nombre de requêtes correspondantes.
-- =========================================================================
SELECT
  entite_type,
  region_code,
  region_lib,
  requete_type,
  type,
  domaine,
  categorie,
  COUNT(*) AS nb_requetes
FROM requete_categorie
GROUP BY entite_type, region_code, region_lib, requete_type,
         type, domaine, categorie
ORDER BY entite_type, region_lib NULLS LAST, type, domaine, categorie, requete_type;
```

### Filtrer le résultat

Pour ne garder que les ARS, ajouter en fin de requête :

```sql
-- ... WHERE entite_type = 'ARS'
```

Pour ne garder qu'un domaine ou un type :

```sql
-- WHERE type = 'Signalement' AND domaine = 'Médico-social'
```

## Requêtes individuelles par statistique

Plus simples à exécuter et à vérifier au cas par cas. Elles renvoient un **scalaire** (le nombre de requêtes distinctes).

### Signalements — Médico-social — PA

```sql
SELECT COUNT(DISTINCT r.id)
FROM "Requete" r
JOIN "PersonneConcernee" pc ON pc."declarantDeId" = r.id
JOIN "Situation"        s   ON s."requeteId"        = r.id
JOIN "LieuDeSurvenue"   lds ON lds.id               = s."lieuDeSurvenueId"
WHERE pc."estSignalementProfessionnel" IS TRUE
  AND lds."lieuTypeId" = 'ETABLISSEMENT_PERSONNES_AGEES';
```

### Signalements — Médico-social — PH

```sql
SELECT COUNT(DISTINCT r.id)
FROM "Requete" r
JOIN "PersonneConcernee" pc ON pc."declarantDeId" = r.id
JOIN "Situation"        s   ON s."requeteId"        = r.id
JOIN "LieuDeSurvenue"   lds ON lds.id               = s."lieuDeSurvenueId"
WHERE pc."estSignalementProfessionnel" IS TRUE
  AND lds."lieuTypeId" = 'ETABLISSEMENT_HANDICAP';
```

### Signalements — Sanitaire — Établissement de santé (+ domicile)

```sql
SELECT COUNT(DISTINCT r.id)
FROM "Requete" r
JOIN "PersonneConcernee" pc ON pc."declarantDeId" = r.id
JOIN "Situation"        s   ON s."requeteId"        = r.id
JOIN "LieuDeSurvenue"   lds ON lds.id               = s."lieuDeSurvenueId"
WHERE pc."estSignalementProfessionnel" IS TRUE
  AND lds."lieuTypeId" IN ('ETABLISSEMENT_SANTE', 'DOMICILE');
```

### Signalements — Sanitaire — Médecine de ville

> Pro de santé mis en cause **sur une situation dont le lieu n'est pas** un établissement de santé. Vraisemblablement à 0 en pratique.

```sql
SELECT COUNT(DISTINCT r.id)
FROM "Requete" r
JOIN "PersonneConcernee" pc ON pc."declarantDeId" = r.id
JOIN "Situation"        s   ON s."requeteId"        = r.id
JOIN "LieuDeSurvenue"   lds ON lds.id               = s."lieuDeSurvenueId"
JOIN "MisEnCause"       mec ON mec.id               = s."misEnCauseId"
WHERE pc."estSignalementProfessionnel" IS TRUE
  AND mec."misEnCauseTypeId" = 'PROFESSIONNEL_SANTE'
  AND lds."lieuTypeId" IS DISTINCT FROM 'ETABLISSEMENT_SANTE';
```

### Réclamations — Médico-social — PA

> Lieu = PA, et **aucune** situation de la requête n'a un pro de santé en mis en cause (NULL inclus).

```sql
SELECT COUNT(DISTINCT r.id)
FROM "Requete" r
JOIN "PersonneConcernee" pc ON pc."declarantDeId" = r.id
JOIN "Situation"        s   ON s."requeteId"        = r.id
JOIN "LieuDeSurvenue"   lds ON lds.id               = s."lieuDeSurvenueId"
WHERE pc."estSignalementProfessionnel" IS NOT TRUE
  AND lds."lieuTypeId" = 'ETABLISSEMENT_PERSONNES_AGEES'
  AND NOT EXISTS (
    SELECT 1
    FROM "Situation" s2
    JOIN "MisEnCause" mec2 ON mec2.id = s2."misEnCauseId"
    WHERE s2."requeteId" = r.id
      AND mec2."misEnCauseTypeId" = 'PROFESSIONNEL_SANTE'
  );
```

### Réclamations — Médico-social — PH

```sql
SELECT COUNT(DISTINCT r.id)
FROM "Requete" r
JOIN "PersonneConcernee" pc ON pc."declarantDeId" = r.id
JOIN "Situation"        s   ON s."requeteId"        = r.id
JOIN "LieuDeSurvenue"   lds ON lds.id               = s."lieuDeSurvenueId"
WHERE pc."estSignalementProfessionnel" IS NOT TRUE
  AND lds."lieuTypeId" = 'ETABLISSEMENT_HANDICAP'
  AND NOT EXISTS (
    SELECT 1
    FROM "Situation" s2
    JOIN "MisEnCause" mec2 ON mec2.id = s2."misEnCauseId"
    WHERE s2."requeteId" = r.id
      AND mec2."misEnCauseTypeId" = 'PROFESSIONNEL_SANTE'
  );
```

### Réclamations — Sanitaire — Établissement de santé

```sql
SELECT COUNT(DISTINCT r.id)
FROM "Requete" r
JOIN "PersonneConcernee" pc ON pc."declarantDeId" = r.id
JOIN "Situation"        s   ON s."requeteId"        = r.id
JOIN "LieuDeSurvenue"   lds ON lds.id               = s."lieuDeSurvenueId"
JOIN "MisEnCause"       mec ON mec.id               = s."misEnCauseId"
WHERE pc."estSignalementProfessionnel" IS NOT TRUE
  AND lds."lieuTypeId" IN ('ETABLISSEMENT_SANTE', 'DOMICILE')
  AND mec."misEnCauseTypeId" = 'ETABLISSEMENT';
```

### Réclamations — Sanitaire — Médecine de ville

```sql
SELECT COUNT(DISTINCT r.id)
FROM "Requete" r
JOIN "PersonneConcernee" pc ON pc."declarantDeId" = r.id
JOIN "Situation"        s   ON s."requeteId"        = r.id
JOIN "MisEnCause"       mec ON mec.id               = s."misEnCauseId"
WHERE pc."estSignalementProfessionnel" IS NOT TRUE
  AND mec."misEnCauseTypeId" = 'PROFESSIONNEL_SANTE';
```

## Annexe : valeurs d'enum utilisées

### `LieuTypeEnum`

| ID | Label |
|---|---|
| `DOMICILE` | Domicile |
| `ETABLISSEMENT_SANTE` | Etablissements de santé |
| `ETABLISSEMENT_PERSONNES_AGEES` | Etablissements pour personnes âgées |
| `ETABLISSEMENT_HANDICAP` | Etablissements pour personnes handicapées |
| `ETABLISSEMENT_SOCIAL` | Etablissements sociaux |
| `AUTRES_ETABLISSEMENTS` | Autres établissements |
| `TRAJET` | Trajet |

### `MisEnCauseTypeEnum`

| ID | Label |
|---|---|
| `ETABLISSEMENT` | Un établissement ou un service |
| `PROFESSIONNEL_SANTE` | Professionnel de santé |
| `PROFESSIONNEL_SOCIAL` | Professionnel social |
| `AUTRE_PROFESSIONNEL` | Autre professionnel |
| `MEMBRE_FAMILLE` | Membre de la famille |
| `PROCHE` | Proche (ami, voisin…) |
| `AUTRE_PERSONNE_NON_PRO` | Autre personne non professionnelle |

### `ReceptionTypeEnum` (valeurs en base)

| ID | Label |
|---|---|
| `EMAIL` | Courrier électronique |
| `COURRIER` | Courrier postal |
| `FORMULAIRE` | Formulaire |
| `PLATEFORME` | Plateforme téléphonique |
| `TELEPHONE` | Téléphone |
| `AUTRE` | Autre |

### Mapping vers `requete_type` (3 valeurs)

| `requete_type` | Source |
|---|---|
| `DematSocial` | `receptionTypeId = 'FORMULAIRE'` (valeur utilisée à l'import DematSocial) |
| `Plateforme téléphonique` | `receptionTypeId = 'PLATEFORME'` |
| `Manuel` | `EMAIL` / `COURRIER` / `TELEPHONE` / `AUTRE` / NULL |

## Vérifications utiles

ARS racines sans région renseignée :

```sql
SELECT id, "nomComplet", "regionCode", "regLib"
FROM "Entite"
WHERE "entiteTypeId" = 'ARS' AND "entiteMereId" IS NULL
ORDER BY "regLib" NULLS FIRST;
```

Profondeur maximale de la hiérarchie ARS :

```sql
WITH RECURSIVE chain AS (
  SELECT id, "entiteMereId", 0 AS depth
  FROM "Entite" WHERE "entiteTypeId" = 'ARS' AND "entiteMereId" IS NULL
  UNION ALL
  SELECT e.id, e."entiteMereId", c.depth + 1
  FROM "Entite" e JOIN chain c ON e."entiteMereId" = c.id
  WHERE e."entiteTypeId" = 'ARS'
)
SELECT MAX(depth) FROM chain;
```

## Points d'attention

- **Double comptage régional** : une requête liée à plusieurs `Entite` de régions différentes apparaîtra dans chaque région. La somme des régions peut donc dépasser le total national.
- **Multi-catégories** : une requête avec plusieurs situations peut tomber dans plusieurs catégories (ex. lieu PA + lieu ES). Les catégories ne sont **pas mutuellement exclusives** par construction.
- **Requêtes non rattachées à une racine** : si une `Entite` traitante n'a pas de chaîne `entiteMere` cohérente (entité orpheline), la requête est exclue. Vérifier les vues de cohérence avant exploitation.
- **Domicile rangé en Sanitaire** : on suit le brief métier (« Lieu de survenue = Etablissements de santé + domicile »). Si la définition évolue, ajuster le `(p.has_es OR p.has_domicile)` dans le `LATERAL VALUES`.
