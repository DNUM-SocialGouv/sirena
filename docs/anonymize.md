# Anonymisation de la base de donnees

Sirena utilise [Greenmask](https://greenmask.io/) pour anonymiser les donnees personnelles (PII) de la base PostgreSQL. Le container produit un dump anonymise de la base source et le restaure sur la base cible.

## Architecture

```
apps/anonymize/
├── Dockerfile        # Image basee sur greenmask/greenmask
├── entrypoint.sh     # Orchestration dump → restore + metriques Prometheus
└── greenmask.yml     # Configuration des transformations par table
```

Le container attend deux variables d'environnement :

| Variable | Description |
|----------|-------------|
| `PG_URL_FROM` | URL PostgreSQL de la base source |
| `PG_URL_TO` | URL PostgreSQL de la base cible |
| `PUSHGATEWAY_URL` | (optionnel) URL du Prometheus Pushgateway pour les metriques |

## Utilisation locale

Le service `anonymize` est declare dans `docker-compose.yaml` avec un profile dedie. Il ne demarre jamais avec `docker compose up`.

```bash
# Anonymiser la base locale en place (source = cible)
dotenv -e .env -- podman compose run --rm anonymize

# Anonymiser vers une autre base
PG_URL_TO=postgresql://user:pass@host:5432/other_db \
  dotenv -e .env -- podman compose run --rm anonymize
```

Pour reconstruire l'image apres un changement de config :

```bash
dotenv -e .env -- podman compose run --build --rm anonymize
```

## Donnees anonymisees

### Donnees personnelles (transformees)

| Table | Champs | Methode |
|-------|--------|---------|
| `User` | prenom, nom, email | RandomPerson / RandomEmail (deterministe) |
| `User` | uid, sub | RandomUuid (deterministe) |
| `User` | pcData | Remplace par `{}` |
| `Session` | token, pcIdToken | RandomUuid |
| `Entite` | email, emailContactUsager | RandomEmail (deterministe) |
| `Entite` | telContactUsager, adresseContactUsager, emailDomain | Valeurs generiques |
| `Identite` | prenom, nom, email, telephone | RandomPerson / RandomEmail |
| `Adresse` | label, numero, rue, codePostal, ville | Adresse generique |
| `PersonneConcernee` | commentaire, victimeInformeeCommentaire, autrePersonnes, lienAutrePrecision | Vide |
| `MisEnCause` | prenom, nom, rpps, finess, nomService, commentaire, autrePrecision | RandomPerson / vide |

### Donnees metier sensibles (videes)

| Table | Champs |
|-------|--------|
| `Requete` | commentaire, provenancePrecision |
| `RequeteEtapeNote` | texte |
| `LieuDeSurvenue` | societeTransport, finess, tutelle, commentaire, lieuPrecision |
| `DemarchesEngagees` | organisme, commentaire |
| `Fait` | commentaire, autresPrecisions |

### Donnees techniques (nettoyees)

| Table | Champs | Methode |
|-------|--------|---------|
| `ChangeLog` | before, after | Mis a null |
| `UploadedFile` | fileName, processingError, scanResult | Anonymise / null |
| `ApiKey` | keyHash, keyPrefix | RandomUuid / valeur generique |
| `DematSocialImportFailure` | errorMessage, errorContext | Anonymise / null |

### Donnees non modifiees

Les tables de reference (enums, communes, referentiels) et les donnees structurelles (relations, dates, statuts) ne sont pas modifiees.

## Deploiement Kubernetes

Un CronJob est disponible dans `helm_charts/charts/anonymize/`. Il est desactive par defaut.

Pour l'activer dans un environnement, ajouter dans le fichier values :

```yaml
anonymize:
  enabled: true
  schedule: "0 3 * * *"  # Tous les jours a 03h00
  pushgatewayUrl: "http://prometheus-pushgateway:9091"
  externalSecret:
    storeName: secret-store
    key: sirena-<env>
```

Les secrets `PG_URL_FROM` et `PG_URL_TO` doivent etre configures dans le secret store externe.

### Metriques Prometheus

Si `PUSHGATEWAY_URL` est configure, le container pousse trois metriques apres chaque execution :

| Metrique | Type | Description |
|----------|------|-------------|
| `sirena_anonymize_last_run_success` | gauge | 1 = succes, 0 = echec |
| `sirena_anonymize_last_run_timestamp_seconds` | gauge | Timestamp Unix de la derniere execution |
| `sirena_anonymize_duration_seconds` | gauge | Duree de l'execution en secondes |

Les metriques Kubernetes natives (`kube_cronjob_*`, `kube_job_*`) sont egalement disponibles via kube-state-metrics.

## CI

Le workflow `.github/workflows/anonymize-smoke-test.yaml` se declenche sur les changements dans `apps/anonymize/` ou `packages/db/prisma/`. Il :

1. Demarre une base PostgreSQL
2. Joue les migrations Prisma
3. Build l'image anonymize
4. Execute `greenmask validate` pour verifier que la config est synchronisee avec le schema

Cela previent les regressions quand le schema evolue sans mise a jour de la config Greenmask.

## Ajouter une nouvelle table

Quand une nouvelle table contenant des PII est ajoutee au schema Prisma :

1. Ajouter une entree dans `apps/anonymize/greenmask.yml` sous `dump.transformation`
2. Le smoke test CI echouera si une colonne referencee n'existe plus (mais pas si une nouvelle table PII est ajoutee sans config) — penser a verifier manuellement
