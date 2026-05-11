# Tests de charge (k6)

Tests de montée en charge de l'API Sirena, basés sur [k6](https://k6.io/). Les scripts vivent dans `tests/load/`.

## Vue d'ensemble

Cinq profils sont fournis :

| Profil   | But                                              | Forme                                    | Durée  |
|----------|--------------------------------------------------|------------------------------------------|--------|
| `smoke`  | Vérifier que l'API répond, sanity check          | 1 VU, `/health` uniquement               | 1 min  |
| `load`   | Charge nominale attendue                         | rampe 0→50 VUs, plateau, descente        | ~7 min |
| `stress` | Trouver le point de rupture                      | rampes 100 → 500 → 1500 → 3000 → 5000 VUs| ~13 min|
| `soak`   | Détecter fuites mémoire, dégradation progressive | 20 VUs constants                         | 30 min |
| `debug`  | Diagnostiquer une config (1 itération, logs verbeux) | 1 VU × 1 itération                   | <1 s   |

Les profils `load`, `stress`, `soak` exécutent un parcours utilisateur authentifié :
boot (`GET /profile`, `GET /entites/chain`) → liste paginée (`GET /requetes-entite`) → détail (`GET /requetes-entite/:id`).

Tous les appels sont des `GET` — aucun scénario n'écrit en base. Voir la section [Sûreté](#sûreté-et-effets-de-bord) plus bas.

Chaque appel HTTP est tagué (`endpoint:profile`, `endpoint:requetes_list`, etc.) pour permettre des seuils par endpoint.

## Prérequis

- **k6** : voir [k6.io/docs/get-started/installation](https://k6.io/docs/get-started/installation/).
- **Backend cible accessible** (local, staging…). En local : `pnpm -F backend dev`.
- **Utilisateur de test pré-existant en base** :
  - Statut `ACTIF`
  - Rattaché à au moins une entité (sinon `GET /requetes-entite` renvoie `400`)
  - Récupérer son `id` (UUID) — il sera passé à k6 via `LOAD_TEST_USER_ID`. Le helper `pnpm op:get-load-test-user` (ou `--email <addr>` pour cibler un utilisateur précis) imprime les deux lignes prêtes à être ajoutées au `.env`.
- **Les secrets backend** : `AUTH_TOKEN_SECRET_KEY`, `AUTH_TOKEN_NAME`, `AUTH_TOKEN_EXPIRATION` doivent être identiques côté k6 et côté backend visé.

### Pourquoi pas ProConnect ?

Le flux OAuth ProConnect est interactif et non testable en charge. À la place, k6 forge directement un cookie `authToken` (JWT HS256 signé avec `AUTH_TOKEN_SECRET_KEY`). Le middleware d'auth backend lit l'utilisateur depuis la base via l'`id` du token — donc tout utilisateur réel et actif suffit.

⚠️ Cela implique que `AUTH_TOKEN_SECRET_KEY` doit être connu de l'opérateur du test. **Ne pas exécuter ces tests contre une cible où ce secret est inaccessible.**

## Configuration

Toute la configuration passe par variables d'environnement. Les valeurs par défaut sont fournies dans le `.env.example` à la racine du dépôt — copie-le en `.env` et ajuste les valeurs spécifiques à ton run (`LOAD_TEST_USER_ID`, `LOAD_TEST_BASE_URL` si non-local, etc.). Les scripts `pnpm test:load:*` chargent ce `.env` automatiquement via `dotenv-cli`.

| Variable                     | Requise pour              | Description                                                                 |
|------------------------------|---------------------------|-----------------------------------------------------------------------------|
| `LOAD_TEST_BASE_URL`         | toujours                  | Hôte de la cible. Le préfixe `/api` est ajouté par le code k6. Défaut : `http://localhost:5173`. |
| `SCENARIO`                   | toujours                  | `smoke` \| `load` \| `stress` \| `soak` \| `debug`.                         |
| `AUTH_TOKEN_SECRET_KEY`      | `load`/`stress`/`soak`    | Secret HS256 du backend cible.                                              |
| `AUTH_TOKEN_NAME`            | optionnel                 | Nom du cookie. Défaut : `authToken`.                                        |
| `AUTH_TOKEN_EXPIRATION`      | optionnel                 | Durée de vie du token signé (secondes). Défaut : `600`.                     |
| `LOAD_TEST_USER_ID`          | `load`/`stress`/`soak`    | UUID de l'utilisateur de test en base.                                      |
| `LOAD_TEST_ROLE_ID`          | optionnel                 | Rôle injecté dans le JWT (le backend le ré-écrit depuis la base).           |
| `PAGE_SIZE`                  | optionnel                 | Taille de page pour la liste. Défaut : `20`.                                |
| `THINK_TIME_MIN/MAX`         | optionnel                 | Temps de réflexion entre étapes (secondes). Défaut : `1`/`3`.               |

## Lancer un test

Depuis la racine du dépôt. Les scripts pnpm chargent automatiquement le `.env` via `dotenv-cli`.

```bash
pnpm test:load:smoke      # 1 VU, /health uniquement
pnpm test:load:nominal    # rampe 0→50 VUs (~7 min)
pnpm test:load:stress     # 100 → 500 → 1500 → 3000 → 5000 VUs (~13 min)
pnpm test:load:soak       # 20 VUs constants pendant 30 min
pnpm test:load:debug      # 1 itération verbeuse, sans seuils — pour diagnostiquer
```

Pour cibler un autre environnement, surcharger `LOAD_TEST_BASE_URL` (et au besoin l'utilisateur / secret) dans le `.env` ou en ligne de commande :

```bash
LOAD_TEST_BASE_URL=https://preproduction.sirena.example pnpm test:load:nominal
```

### Le profil `debug`

`pnpm test:load:debug` exécute une seule itération de l'ensemble du parcours, en imprimant pour chaque appel : URL résolue, statut HTTP, durée, `Content-Type`, en-tête `Set-Cookie`, et un extrait du corps de la réponse (utile sur les 401/4xx). Il imprime aussi la config résolue (host cible, nom du cookie, longueur du secret, payload JWT décodé). À utiliser dès qu'un run nominal est rouge sans raison évidente.

## Seuils par défaut

Définis dans `tests/load/main.js` :

- `http_req_failed` < 1 %
- `http_req_duration` p95 < 500 ms, p99 < 1500 ms
- `endpoint:health` p95 < 100 ms
- `endpoint:requetes_list` p95 < 800 ms
- `endpoint:requete_detail` p95 < 600 ms
- `checks` > 99 % de succès

Ces seuils sont des points de départ — à ajuster selon les SLO. Si un seuil est dépassé, k6 sort en code 99.

## Lire les résultats

À la fin du run, k6 affiche :

- **`http_req_duration`** : latence côté client. Regarder p95/p99, pas la moyenne.
- **`http_req_failed`** : taux d'échec HTTP (4xx/5xx).
- **`checks`** : assertions custom (`status 2xx`, etc.). Doit rester proche de 100 %.
- **Métriques par tag** (`endpoint:requetes_list` etc.) : permettent d'identifier l'endpoint qui dégrade.

Pour exporter en JSON :

```bash
k6 run --out json=results.json tests/load/main.js
```

Pour pousser vers une stack Prometheus/Grafana, voir [k6 output extensions](https://grafana.com/docs/k6/latest/results-output/).

## Sûreté et effets de bord

Les scénarios ne font que des `GET` — aucune donnée applicative (utilisateurs, requêtes, entités…) n'est créée, modifiée ou supprimée. Mais "lecture seule" ne veut pas dire "sans impact" :

- **DB** : chaque appel exécute au moins deux requêtes Prisma (auth `getUserById` + `getUserEntities`) plus celles du contrôleur. À 5000 VUs (pic du stress), le pool de connexions s'épuise quasi instantanément et dégrade les vrais utilisateurs.
- **Logs** : chaque requête est loggée par Pino. Un stress run remplit le backend de logs (coût, alertes d'ingestion).
- **Sentry** : le contexte utilisateur est mis à jour par `auth.middleware.ts` à chaque requête, et les éventuelles erreurs transitoires sous charge sont remontées.
- **Rate limiter** : n'écrit en Redis qu'en cas de `401`. Si l'auth échoue, l'IP de la source est bannie (1 min, puis 2, 4, 8…). Sur un runner partagé, ça peut bannir d'autres outils ; flusher Redis (`FLUSHDB`) si nécessaire.
- **Pas d'émission de session** : k6 forge ses JWTs, le backend ne crée ni session ni refresh token côté DB.
- **Monitoring** : APM, dashboards et oncall vont voir la charge. Coordonner avant d'envoyer.
- **Secret en clair sur le runner** : exécuter `load`/`stress`/`soak` requiert `AUTH_TOKEN_SECRET_KEY` côté runner. Cible-le impact : qui a accès à ce secret peut signer un cookie pour n'importe quel utilisateur.

Recommandation :

- `smoke` en prod : OK (1 VU, `/health` uniquement, pas d'auth).
- `load`/`stress`/`soak` : à exécuter sur `preproduction` plutôt que sur `production`. Un environnement avec un volume de données proche de la prod donne un signal réaliste sans toucher aux vrais utilisateurs.

## CI

Un workflow GitHub Actions est fourni : `.github/workflows/load-test.yaml`. Déclenchement manuel uniquement (`workflow_dispatch`), choix de l'environnement et du profil. Les secrets et `LOAD_TEST_BASE_URL` sont scopés via les **GitHub Environments** (`formation`, `preproduction`, `production`) :

| Type    | Nom                              | Description                                                  |
|---------|----------------------------------|--------------------------------------------------------------|
| secret  | `LOAD_TEST_AUTH_TOKEN_SECRET_KEY`| Secret HS256 du backend cible                                |
| secret  | `LOAD_TEST_USER_ID`              | UUID d'un utilisateur `ACTIF` rattaché à une entité          |
| var     | `LOAD_TEST_BASE_URL`             | Hôte (sans `/api`) de l'API cible                            |
| var     | `LOAD_TEST_AUTH_TOKEN_NAME`      | Optionnel — nom du cookie. Défaut : `authToken`              |

Recommandé : activer **Required reviewers** sur l'environnement `production` pour qu'aucun stress/soak ne puisse y partir sans validation manuelle. Les artefacts du run (`k6-results.json`) sont conservés 30 jours.

## Bonnes pratiques

- **Toujours commencer par un smoke** avant un load/stress, pour valider conf et auth.
- **Surveiller la cible** : CPU, RAM, connexions DB, queues Redis. Un test "qui passe" côté k6 mais qui sature la DB n'est pas un succès.
- **Ne pas tester sur sa propre machine** ce qui doit l'être en environnement dédié : un k6 stress local peut saturer le CPU et fausser les latences.
- **Coordonner avec ops** avant tout test sur validation/prod (alertes Sentry, rate-limit, dashboards).
