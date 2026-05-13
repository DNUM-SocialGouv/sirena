# Test de charge — campagne mai 2026

Compte rendu de la première campagne de tests de charge menée sur l'environnement
`integration`. Documente les runs k6 successifs, les ajustements de ressources
Helm qu'ils ont déclenchés, et les enseignements pour la suite.

Pour la **mise en œuvre** du système k6 lui-même (profils, variables, runtime),
voir [`load-testing.md`](./load-testing.md). Ce document-ci ne couvre que la
chronologie et les résultats.

## Contexte

- Cible : `integration` (env `integration`)
- Profils joués : `smoke`, `load`, `stress` (voir `tests/load/main.js`)
- Workflow GitHub Actions : `.github/workflows/load-test.yaml` (déclenchement manuel)
- Période couverte : 2026-05-11 → 2026-05-13

Les définitions de profils dans `tests/load/main.js` n'ont **pas** bougé depuis
leur création (commit `ae754a77`). En particulier, le profil `stress` rampe
toujours `100 → 500 → 1500 → 3000 → 5000` VUs sur ~13 min. Ce qui évolue d'un
run à l'autre, c'est la **résistance du cluster** : à quel palier le backend
casse, et à quels seuils de latence on cale en `load` nominal.

## Chronologie des modifications Helm

Les valeurs ci-dessous concernent `helm_charts/charts/<service>/values.yaml`
(valeurs par défaut, héritées par tous les environnements sauf override).

### État initial (avant campagne)

| Service               | CPU limit | CPU request | Memory      |
|-----------------------|-----------|-------------|-------------|
| backend               | 250m      | 250m        | 1500Mi      |
| backend init (migrations) | 250m  | 250m        | 1500Mi      |
| frontend              | 250m      | 250m        | 900Mi       |
| worker                | 250m      | 250m        | 1500Mi      |

### Étape 1 — commit `c16001a0` (2026-05-12)

> `ci: update load test user selection to require ROLES_READ` /
> `Update load testing documentation for auth_token cookie default` /
> `Increase backend and init container CPU limits`

Déclenché par le run `load` du 2026-05-12 (run #4) qui s'est effondré à 50 VUs
avec p95 ≈ 10.75 s.

| Service       | CPU limit       | CPU request     |
|---------------|-----------------|-----------------|
| backend       | 250m → **500m** | 250m → **500m** |
| backend init  | 250m → **300m** | 250m → **300m** |

Frontend et worker non modifiés à cette étape. Le même commit corrige aussi le
défaut du nom de cookie côté k6 (`authToken` → `auth_token`, pour matcher la
config réellement déployée) et restreint la sélection de l'utilisateur de test
à un rôle `ROLES_READ` (cf. `apps/backend/src/scripts/get-load-test-user.ts`).

Refs :
- https://grafana.atlas.fabrique.social.gouv.fr/goto/bflyer3dwp9fkf?orgId=79

### Étape 2 — commit `9dfdef65` (2026-05-13)

> `chore: increase CPU resources for backend frontend and worker services`

Déclenché par les deux runs `stress` du 2026-05-13 (runs #6 et #7) qui
échouaient autour de 1150–1580 VUs avec des `unexpected EOF`, et le run `load`
#8 dont le p95 (1.51 s) restait au-dessus du seuil de 500 ms.

| Service   | CPU limit         | CPU request     |
|-----------|-------------------|-----------------|
| backend   | 500m → **1500m**  | 500m → **750m** |
| frontend  | 250m → **750m**   | 250m (inchangé) |
| worker    | 250m → **1500m**  | 250m → **450m** |

Les mémoires restent inchangées (1500 Mi backend/worker, 900 Mi frontend) : la
saturation observée est purement CPU.

## Chronologie des runs GitHub Actions (workflow `Load Test (k6)`)

Tous lancés en `workflow_dispatch` contre l'environnement `integration`.

| #                                                                                              | Date (UTC)        | Profil  | Issue       | VUs cible | Grafana                                                                              | Observation clé |
|------------------------------------------------------------------------------------------------|-------------------|---------|-------------|-----------|--------------------------------------------------------------------------------------|-----------------|
| [1](https://github.com/DNUM-SocialGouv/sirena/actions/runs/25670198577/job/75388574484)        | 2026-05-11 12:30  | smoke   | failure     | 1         | —                                                                                    | Premier essai, fail de bring-up. |
| [2](https://github.com/DNUM-SocialGouv/sirena/actions/runs/25680913004/job/75514021827)        | 2026-05-11 15:48  | stress  | cancelled   | 5000      | —                                                                                    | Tentative prématurée, annulée. |
| [3](https://github.com/DNUM-SocialGouv/sirena/actions/runs/25719186080/job/75515970665)        | 2026-05-12 07:08  | smoke   | **success** | 1         | —                                                                                    | Sanity OK. |
| [4](https://github.com/DNUM-SocialGouv/sirena/actions/runs/25719394098/job/75518414854)        | 2026-05-12 07:13  | load    | failure     | 50        | [dashboard](https://grafana.atlas.fabrique.social.gouv.fr/goto/fflyezq9m2xhce?orgId=79) | p95=10.75 s — backend saturé à 50 VUs. Déclenche l'étape 1 Helm. |
| [5](https://github.com/DNUM-SocialGouv/sirena/actions/runs/25802180474/job/75794971493)        | 2026-05-13 13:28  | load    | failure     | 50        | [dashboard](https://grafana.atlas.fabrique.social.gouv.fr/goto/dflyf1wcms8hse?orgId=79) | Premier rejeu après l'étape 1 (toujours rouge). |
| [6](https://github.com/DNUM-SocialGouv/sirena/actions/runs/25802768314/job/75797083417)        | 2026-05-13 13:39  | stress  | cancelled   | 5000      | [dashboard](https://grafana.atlas.fabrique.social.gouv.fr/goto/eflyf2zgrjls0b?orgId=79) | `unexpected EOF` en masse vers **1146 VUs / 04m17s**. |
| [7](https://github.com/DNUM-SocialGouv/sirena/actions/runs/25805149935/job/75805688571)        | 2026-05-13 14:20  | stress  | cancelled   | 5000      | [dashboard](https://grafana.atlas.fabrique.social.gouv.fr/goto/bflyf4optfvuod?orgId=79) | Même symptôme à **1579 VUs / 05m08s**. |
| [8](https://github.com/DNUM-SocialGouv/sirena/actions/runs/25807950468/job/75815953372)        | 2026-05-13 15:09  | load    | failure     | 50        | —                                                                                    | p95=1.51 s — net mieux mais encore au-dessus de 500 ms. Déclenche l'étape 2 Helm. |

### Détail des runs `load` (50 VUs nominaux)

Comparaison à profil identique (rampe 0 → 50 → 0 VUs sur 7 min), seul le
dimensionnement backend change :

| Métrique                              | Run #4 (backend 250m) | Run #8 (backend 500m + init 300m) |
|---------------------------------------|------------------------|-------------------------------------|
| `http_req_duration` p95               | 10.75 s                | **1.51 s**                          |
| `http_req_duration` p99               | 11.36 s                | **1.89 s**                          |
| `requete_detail` p95                  | 10.35 s                | **1.16 s**                          |
| `requetes_list` p95                   | 11.31 s                | **1.83 s**                          |
| `http_reqs` total                     | 2 516                  | **10 944**                          |
| Débit (`http_reqs/s`)                 | 5.94 / s               | **25.89 / s**                       |
| `iterations` complétées               | 629                    | **2 736**                           |
| `iteration_duration` avg              | 29.28 s                | **6.62 s**                          |
| `http_req_failed`                     | 0 %                    | 0 %                                 |
| `checks_succeeded`                    | 100 %                  | 100 %                               |

L'étape 1 Helm (×2 sur le CPU backend) donne ~4× de débit et divise la p95 par
~7. Aucune erreur HTTP dans les deux cas — la dégradation est purement
latence/contention CPU, pas en crash. Le seuil `p(95)<500ms` reste cependant
violé après cette première étape ; l'étape 2 (1500m / 750m) n'a pas encore été
mesurée à la date de rédaction.

### Détail des runs `stress` (rampe jusqu'à 5000 VUs)

Aucun run `stress` n'est allé au bout : la cible décroche bien avant 5000 VUs
et le job est annulé manuellement. Le breakpoint **monte** au fur et à mesure
que l'on monte le CPU :

| Run | Backend CPU | Breakpoint observé (`unexpected EOF`) | Temps écoulé |
|-----|-------------|----------------------------------------|--------------|
| #6  | 500m        | ~1146 VUs                              | 04m17s       |
| #7  | 500m        | ~1579 VUs                              | 05m08s       |

> Note : le run #6 et le run #7 sont sur la même config Helm. Le delta de
> breakpoint vient du voisinage cluster (autres charges sur `integration`) et
> de la variance d'allocation pod, pas d'un changement de configuration. À
> retenir : le breakpoint a une plage, pas une valeur unique.

Le mode de défaillance observé est systématique :

```
level=warning msg="Request Failed" error="Get \".../api/profile\": unexpected EOF"
level=warning msg="Request Failed" error="Get \".../api/requetes-entite?limit=20&offset=0\": unexpected EOF"
```

Soit le pod backend qui ferme la connexion TCP — soit redémarrage liveness, soit
saturation event-loop avec timeout côté ingress. La piste OOM est exclue
(mémoire à 1500 Mi, inchangée). À confirmer via les dashboards Grafana au
moment du run.

## Lecture des résultats — méthode

Pour les prochains runs, comparer dans cet ordre :

1. **`http_req_failed`** — si non-nul, on est en mode panne, inutile de
   regarder les latences avant d'avoir remis le service debout.
2. **`http_req_duration` p95 / p99** par tag d'endpoint
   (`endpoint:requetes_list`, `endpoint:requete_detail`) — identifier
   l'endpoint qui dégrade en premier.
3. **`http_reqs / s` et `iterations`** — débit effectif. Une p95 qui s'améliore
   pendant que le débit s'effondre signifie qu'on a juste perdu des VUs en
   route.
4. **Côté cible (Grafana / kube)** — CPU pod, throttling, pool Prisma, latence
   DB. Un k6 qui "passe" mais qui sature la DB n'est pas un succès.

Les seuils par défaut (`tests/load/main.js`) sont des points de départ basés
sur les SLO attendus, pas sur la capacité actuelle. Ils sont volontairement
tenus stricts : un run rouge n'est pas une défaillance du test, c'est un signal
d'alignement attendu/observé à instruire.

## État au 2026-05-13 et suites

État courant à la dernière mesure (run #8) :

- Le backend tient les **50 VUs nominaux** sans erreur HTTP avec ~25 req/s.
- p95 = 1.51 s, donc 3× au-dessus du seuil `p(95)<500ms`.
- Le stress décroche entre 1150 et 1580 VUs (mesure faite avec 500m backend ;
  pas encore re-mesurée après l'étape 2 Helm).

Pistes pour la prochaine itération :

1. **Re-jouer `load` et `stress` après l'étape 2 Helm** (1500m backend / 750m
   request, 1500m worker, 750m frontend). Vérifier que la p95 passe sous
   500 ms ou comprendre ce qui sature ensuite.
2. **Profiler le chemin chaud** (`GET /requetes-entite`, `GET /requetes-entite/:id`).
   À 50 VUs avec 1.5 s de p95, le bottleneck n'est probablement plus CPU
   backend mais Prisma / DB / sérialisation.
3. **Instrumenter le pool Prisma** sous charge (taille de pool, attente
   d'acquisition) — c'est le candidat évident pour expliquer le décrochage
   stress à ~1500 VUs.
4. **Activer le retry / circuit-break** côté k6 pour mieux caractériser le
   breakpoint stress (aujourd'hui on s'arrête au premier batch d'EOF, donc on
   ne sait pas si le pod récupère).
5. **Sortir de `integration`** : ce cluster est partagé et bruité. Une fois
   les SLO load atteints, refaire la mesure en `preproduction` (volume de
   données plus représentatif, voisinage maîtrisé) avant toute conclusion.

## Références

- Profils et seuils : `tests/load/main.js`
- Documentation opérationnelle : [`load-testing.md`](./load-testing.md)
- Workflow CI : `.github/workflows/load-test.yaml`
- Valeurs Helm : `helm_charts/charts/{backend,frontend,worker}/values.yaml`
- Commits clés : `ae754a77` (création), `c16001a0` (étape 1 CPU), `9dfdef65`
  (étape 2 CPU)
