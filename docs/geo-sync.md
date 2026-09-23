# Synchronisation du référentiel géographique

Les tables `Commune` et `InseePostal` alimentent l'algorithme d'affectation : elles traduisent
un code postal en département, puis en conseil départemental ou en DDETS. Elles sont
rafraîchies depuis deux jeux de données publics.

| Source | Contenu | Encodage |
|--------|---------|----------|
| [t_geo_com](https://www.data.gouv.fr/fr/datasets/r/2648d606-504d-4e91-ac1f-d70c92adc039) (Atlasanté) | Communes et collectivités actuelles | UTF-8 |
| [Base officielle des codes postaux](https://www.data.gouv.fr/fr/datasets/r/008a2dda-2c60-4b63-b910-998f6f818089) (La Poste) | Correspondance code INSEE / code postal | latin-1 |

Les URL sont surchargeables par `GEO_REFERENTIEL_COMMUNES_URL` et `GEO_REFERENTIEL_POSTAL_URL` :
data.gouv.fr peut renuméroter une ressource.

## Planification

La synchronisation est portée par un CronJob Kubernetes (`helm_charts/charts/geo-sync`), et
non par le planificateur interne de l'application.

La raison est mécanique : `cron.scheduler.ts` supprime et recrée ses jobs répétables à chaque
démarrage du worker. Une échéance relative d'un mois repartirait donc de zéro à chaque
déploiement, et la synchronisation ne se déclencherait jamais entre deux mises en production.
Un CronJob raisonne en dates de calendrier, qu'un redémarrage ne décale pas.

Par défaut, le 1er de chaque mois à 3 h UTC. Le rythme suffit : les fusions de communes
prennent effet au 1er janvier.

| Environnement | État |
|---------------|------|
| production | actif |
| integration | présent mais suspendu, pour déclenchement à la demande |
| autres | absent (deux lignes dans `values/<env>.yaml` suffisent à l'activer) |

## Déclencher à la demande

C'est aussi ainsi qu'on la teste :

```bash
kubectl create job --from=cronjob/geo-sync geo-sync-$(date +%s)
kubectl logs -f job/geo-sync-<suffixe>
```

Le job reprend les mêmes garde-fous que l'exécution automatique, et la synchronisation est
idempotente : la rejouer ne coûte qu'un téléchargement.

## En local

```bash
# Rapporte le diff sans rien écrire
pnpm --filter @sirena/backend op:sync:geodata --dry-run

# Applique
pnpm --filter @sirena/backend op:sync:geodata

# Applique y compris les suppressions bloquées par le garde-fou
pnpm --filter @sirena/backend op:sync:geodata --force
```

## Garde-fous

Une source amputée ou dont le format a changé ne doit pas vider le référentiel qui sert à
router les requêtes. Avant toute écriture (`geoReferentiel.constant.ts`) :

| Contrôle | Seuil | Effet |
|----------|-------|-------|
| Communes lues | 34 000 minimum | échec |
| Couples INSEE / code postal lus | 33 000 minimum | échec |
| Lignes illisibles | 0,1 % maximum | échec |
| Codes postaux rattachés à une commune inconnue | 100 maximum | échec |
| Suppressions de codes postaux | plus de 2 % **et** plus de 500 lignes | suppressions ignorées, ajouts et mises à jour appliqués |

Le dernier cas n'échoue pas : il applique ce qui est additif et journalise une erreur. Pour
forcer les suppressions après vérification, relancer avec `--force`.

Les deux conditions sont cumulatives, et le plancher de 500 lignes n'est là que pour les bases
peu remplies — un environnement de développement où 2 % ne représentent qu'une poignée de
lignes. Au volume de production, 2 % valent environ 700 lignes : c'est le ratio qui décide.

Les écritures des deux tables tiennent dans une seule transaction : une interruption ne laisse
jamais `Commune` rafraîchie face à un `InseePostal` resté sur l'ancien référentiel.

## Suivi

Hors dry-run, chaque exécution laisse une ligne dans la table `Crons` sous le nom
`sync-geo-referentiel`, avec son état et son résultat (créations, mises à jour, suppressions,
communes orphelines, rapport de couverture).

```sql
SELECT "startedAt", "endedAt", state, result
FROM "Crons"
WHERE name = 'sync-geo-referentiel'
ORDER BY "createdAt" DESC
LIMIT 5;
```

Le rapport de couverture recense les territoires sans entité CD ou DDETS en face : une requête
localisée sur l'un d'eux ne trouve pas son entité et bascule vers le repli régional. Certains
trous sont légitimes — les collectivités d'outre-mer n'ont ni conseil départemental ni DDETS —
d'où un simple signalement, sans échec du job.

### La première exécution réécrit tout `InseePostal`

Ce n'est pas un incident. Sur un environnement alimenté par l'ancien `op:import:geodata`,
`libelleAcheminement` est NULL sur toutes les lignes alors que la source le renseigne : la
table entière ressort donc comme modifiée. Mesuré sur une base reconstituée à l'identique,
la première exécution rapporte environ 35 400 mises à jour et la suivante zéro.

Les communes, elles, ne bougent presque pas : leurs colonnes étaient déjà toutes renseignées,
seuls les vrais changements du référentiel remontent (quelques dizaines de lignes).

C'est la raison pour laquelle les mises à jour partent par lots plutôt qu'une à une : ligne
par ligne, 35 000 allers-retours dépasseraient le délai de la transaction, qui annulerait tout
et rejouerait le même échec au mois suivant.
