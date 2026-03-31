# Service d'anonymisation Analytics

## Objectif

- Permettre aux data-analystes d'exploiter les donnees Sirena via Metabase
- Base de donnees separee avec schema en etoile (star schema)
- Donnees personnelles supprimees ou generalisees

## Architecture

- App separee dans `apps/analytics`
- Lit la DB source Sirena (read-only)
- Ecrit dans une DB PostgreSQL analytics dediee
- Orchestration via BullMQ (meme Redis que le backend)
- Schema Prisma dedie optimise pour les requetes analytiques

```
┌──────────────┐     ┌───────────────────┐     ┌──────────────────┐     ┌──────────┐
│  DB Sirena   │────▶│  apps/analytics   │────▶│  DB Analytics    │◀────│ Metabase │
│  (source)    │     │  (workers BullMQ) │     │  (star schema)   │     │          │
└──────────────┘     └───────────────────┘     └──────────────────┘     └──────────┘
                              │
                              ▼
                     ┌────────────────┐
                     │     Redis      │
                     │  (job queues)  │
                     └────────────────┘
```

## Strategie de synchronisation a 3 niveaux

### 1. Sync incrementale (toutes les 5 min)

Synchronisation delta basee sur le champ `updatedAt` et la table `ChangeLog`. Les deux sources sont combinees en union dedupliquee pour garantir qu'aucune modification n'est manquee, meme si l'une des deux sources est temporairement incomplete.

### 2. Reconciliation (quotidienne a 3h)

Comparaison des counts et checksums entre la base source et la base analytics. Les drifts inferieurs au seuil configurable sont corriges automatiquement par re-synchronisation des enregistrements concernes.

### 3. Alerte

Si le drift depasse le seuil configurable (defaut 5%), un log warning est emis. Aucune correction automatique n'est effectuee afin d'eviter une re-synchronisation massive non supervisee. Une intervention manuelle est requise.

## Monitoring

Metriques Prometheus exposees sur le port `9090` (configurable via `MONITORING_PORT`) a l'endpoint `/metrics`.

### Metriques de synchronisation

| Metrique | Type | Description |
|---|---|---|
| `sirena_analytics_sync_runs_total` | Counter | Nombre total de syncs par type et statut |
| `sirena_analytics_sync_duration_seconds` | Histogram | Duree des syncs en secondes |
| `sirena_analytics_sync_records_processed_total` | Counter | Enregistrements traites par entite |
| `sirena_analytics_sync_last_run_timestamp_seconds` | Gauge | Timestamp Unix de la derniere sync |
| `sirena_analytics_sync_last_run_success` | Gauge | Succes de la derniere sync (1/0) |
| `sirena_analytics_sync_errors_total` | Counter | Erreurs de sync par entite |

### Metriques de reconciliation

| Metrique | Type | Description |
|---|---|---|
| `sirena_analytics_drift_percent` | Gauge | Pourcentage de drift par table |
| `sirena_analytics_orphans_deleted_total` | Counter | Orphelins supprimes par table |
| `sirena_analytics_missing_resynced_total` | Counter | Enregistrements manquants re-synchronises |

Les metriques Node.js par defaut (memoire, CPU, event loop) sont egalement collectees.

## Schema en etoile

### Tables de dimensions

- **DimEntite** — entites (directions, services)
- **DimCommune** — communes et departements
- **DimTemps** — dimension temporelle (jour, mois, annee, trimestre)
- **DimMotif** — motifs de reclamation
- **DimConsequence** — consequences constatees
- **DimMaltraitanceType** — types de maltraitance
- **DimMisEnCauseType** — types de mis en cause
- **DimLieuType** — types de lieu

### Tables de faits

- **FactRequete** — table centrale des requetes (faits principaux)
- **FactEtape** — etapes du traitement des requetes

### Tables de pont

- **FactFaitMotif** — liaison faits / motifs (relation N-N)
- **FactFaitConsequence** — liaison faits / consequences (relation N-N)
- **FactFaitMaltraitanceType** — liaison faits / types de maltraitance (relation N-N)

### Tables systeme

- **SyncCursor** — curseurs de synchronisation (derniere position traitee)
- **SyncLog** — journal des operations de synchronisation

## Configuration

| Variable | Description | Defaut |
|---|---|---|
| `DATABASE_URL` | Connexion a la DB source (lecture seule) | — |
| `ANALYTICS_DATABASE_URL` | Connexion a la DB analytics | — |
| `REDIS_HOST` | Hote Redis partage | — |
| `REDIS_PORT` | Port Redis | — |
| `REDIS_USERNAME` | Utilisateur Redis | — |
| `REDIS_PASSWORD` | Mot de passe Redis | — |
| `INCREMENTAL_INTERVAL_MS` | Intervalle sync incrementale (ms) | `300000` (5 min) |
| `RECONCILIATION_CRON` | Expression CRON reconciliation | `0 3 * * *` |
| `DRIFT_THRESHOLD_PERCENT` | Seuil d'alerte de drift (%) | `5` |
| `MONITORING_PORT` | Port du serveur de metriques Prometheus | `9090` |
| `LOG_LEVEL` | Niveau de log | `info` |

## Commandes

```bash
# Developpement
pnpm -F @sirena/analytics dev

# Generer le client Prisma
pnpm -F @sirena/analytics db:generate

# Lancer les migrations
pnpm -F @sirena/analytics db:migrate

# Build production
pnpm -F @sirena/analytics build
```

