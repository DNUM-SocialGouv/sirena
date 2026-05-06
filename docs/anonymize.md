# Anonymisation de la base de données

Sirena utilise [Greenmask](https://greenmask.io/) pour anonymiser les données personnelles (PII) de la base PostgreSQL. Le container produit un dump anonymisé de la base source et le restaure sur la base cible.

## Architecture

```
apps/anonymize/
├── Dockerfile        # Image basée sur greenmask/greenmask
├── entrypoint.sh     # Orchestration dump → restore + métriques Prometheus
└── greenmask.yml     # Configuration des transformations par table
```

Le container attend deux variables d'environnement :

| Variable | Description |
|----------|-------------|
| `PG_URL_FROM` | URL PostgreSQL de la base source |
| `PG_URL_TO` | URL PostgreSQL de la base cible |
| `PUSHGATEWAY_URL` | (optionnel) URL du Prometheus Pushgateway pour les métriques |

## Utilisation locale

Le service `anonymize` est déclaré dans `docker-compose.yaml` avec un profile dédié. Il ne démarre jamais avec `docker compose up`.

```bash
# Anonymiser la base locale en place (source = cible)
dotenv -e .env -- podman compose run --rm anonymize

# Anonymiser vers une autre base
PG_URL_TO=postgresql://user:pass@host:5432/other_db \
  dotenv -e .env -- podman compose run --rm anonymize
```

Pour reconstruire l'image après un changement de config :

```bash
dotenv -e .env -- podman compose run --build --rm anonymize
```

## Données anonymisées

### Données personnelles (transformées)

| Table | Champs | Méthode |
|-------|--------|---------|
| `User` | prenom, nom, email | RandomPerson / RandomEmail (déterministe) |
| `User` | uid, sub | RandomUuid (déterministe) |
| `User` | pcData | Remplacé par `{}` |
| `Session` | token, pcIdToken | RandomUuid |
| `Entite` | email, emailContactUsager | RandomEmail (déterministe) |
| `Entite` | telContactUsager, adresseContactUsager, emailDomain | Valeurs génériques |
| `Identite` | prenom, nom, email, telephone | RandomPerson / RandomEmail |
| `Adresse` | label, numero, rue, codePostal, ville | Adresse générique |
| `PersonneConcernee` | commentaire, victimeInformeeCommentaire, autrePersonnes, lienAutrePrecision | Vide |
| `MisEnCause` | prenom, nom, rpps, finess, nomService, commentaire, autrePrecision | RandomPerson / vide |

### Données métier sensibles (vidées)

| Table | Champs |
|-------|--------|
| `Requete` | commentaire, provenancePrecision |
| `RequeteEtapeNote` | texte |
| `LieuDeSurvenue` | societeTransport, finess, tutelle, commentaire, lieuPrecision |
| `DemarchesEngagees` | organisme, commentaire |
| `Fait` | commentaire, autresPrecisions |

### Données techniques (nettoyées)

| Table | Champs | Méthode |
|-------|--------|---------|
| `ChangeLog` | before, after | Mis à null |
| `UploadedFile` | fileName, processingError, scanResult | Anonymisé / null |
| `ApiKey` | keyHash, keyPrefix | RandomUuid / valeur générique |
| `DematSocialImportFailure` | errorMessage, errorContext | Anonymisé / null |

### Données non modifiées

Les tables de référence (enums, communes, référentiels) et les données structurelles (relations, dates, statuts) ne sont pas modifiées.

## Déploiement Kubernetes

Un CronJob est disponible dans `helm_charts/charts/anonymize/`. Il est désactivé par défaut.

Pour l'activer dans un environnement, ajouter dans le fichier values :

```yaml
anonymize:
  enabled: true
  schedule: "0 3 * * *"  # Tous les jours à 03h00
  pushgatewayUrl: "http://prometheus-pushgateway:9091"
  externalSecret:
    storeName: secret-store
    key: sirena-<env>
```

Les secrets `PG_URL_FROM` et `PG_URL_TO` doivent être configurés dans le secret store externe.

### Métriques Prometheus

Si `PUSHGATEWAY_URL` est configuré, le container pousse trois métriques après chaque exécution :

| Métrique | Type | Description |
|----------|------|-------------|
| `sirena_anonymize_last_run_success` | gauge | 1 = succès, 0 = échec |
| `sirena_anonymize_last_run_timestamp_seconds` | gauge | Timestamp Unix de la dernière exécution |
| `sirena_anonymize_duration_seconds` | gauge | Durée de l'exécution en secondes |

Les métriques Kubernetes natives (`kube_cronjob_*`, `kube_job_*`) sont également disponibles via kube-state-metrics.

## CI

Le workflow `.github/workflows/anonymize-smoke-test.yaml` se déclenche sur les changements dans `apps/anonymize/` ou `packages/db/prisma/`. Il :

1. Démarre une base PostgreSQL
2. Joue les migrations Prisma
3. Build l'image anonymize
4. Exécute `greenmask validate` pour vérifier que la config est synchronisée avec le schéma

Cela prévient les régressions quand le schéma évolue sans mise à jour de la config Greenmask.

## Ajouter une nouvelle table

Quand une nouvelle table contenant des PII est ajoutée au schéma Prisma :

1. Ajouter une entrée dans `apps/anonymize/greenmask.yml` sous `dump.transformation`
2. Le smoke test CI échouera si une colonne référencée n'existe plus (mais pas si une nouvelle table PII est ajoutée sans config) — penser à vérifier manuellement
