# Post-mortem - Habilitations réinitialisées sur l'integration du 07/10 au 19/10/2026

## Objet

Des comptes d'agents de l'environnement **integration** se sont retrouvés « en attente
d'habilitation » (rôle `PENDING`, statut `NON_RENSEIGNE`) ou inactifs, sans qu'aucun
administrateur n'ait modifié leur rôle. Le phénomène a été signalé le 19/10, et remonte au
moins au 07/10.

La cause n'est pas applicative : c'est la **suite de tests E2E, lancée par la CI à chaque push
sur `main`, qui écrit dans la base de l'integration**. Deux scénarios de `admin.spec.ts`
modifient l'habilitation d'un compte réel choisi arbitrairement, et depuis le 07/10 ils
échouent systématiquement **après** l'écriture et **avant** la restauration.

## Impact

- **Utilisateurs** : sur l'integration, des agents se retrouvent bloqués sur la page
  « Votre compte SIRENA est inactif / en attente de validation. Veuillez contacter votre
  administrateur », sans aucune action de leur part ni de celle des administrateurs. Perte
  d'accès jusqu'à réhabilitation manuelle.
- **Sécurité** : le rejeu du test peut aussi **promouvoir** un compte arbitraire en
  `ENTITY_ADMIN` (voir point 2). C'est une élévation de privilèges non intentionnelle, limitée
  à l'integration.
- **Production** : aucun impact. Le job E2E est gardé par `if: github.ref_name == 'main'` et son
  `BASE_URL` ne vise que l'integration. Vérifié également côté production : aucune anomalie
  d'authentification dans les logs backend (seules 11 `TokenExpiredError` nominales sur 6 h).
- **Confiance** : la CI est restée au rouge sur le shard 1 pendant 12 jours sans que l'échec
  soit traité, et l'absence d'auteur humain identifiable a fait soupçonner un bug applicatif de
  gestion des rôles.
- **Données** : aucune perte. Les valeurs d'origine sont récupérables depuis la table
  `ChangeLog` (champ `before`).

## Cause principale

`apps/frontend/tests/admin.spec.ts` modifiait l'habilitation d'un compte **réel et non
dédié**, sur un environnement **partagé**, sans restauration garantie :

1. Le job `e2e-tests` (`.github/workflows/auto-deploy.yaml`) tourne à chaque push sur `main`,
   après déploiement, contre `https://sirena.integration.dev.atlas.fabrique.social.gouv.fr`,
   authentifié avec un vrai compte `ENTITY_ADMIN` (`vars.TEST_USER_EMAIL`).
2. `navigateToUserEditPage()` prenait **la première ligne de `/admin/users/all` qui n'est pas
   soi-même** — donc le compte d'un agent, déterminé par le tri par défaut sur `nom`.
3. Le scénario « change le rôle d'un utilisateur puis le remet à sa valeur d'origine » posait
   `PENDING` en première étape, puis tentait de restaurer en seconde étape. La restauration
   n'était pas dans un hook de teardown : tout échec entre les deux la supprimait purement et
   simplement.

L'échec qui a déclenché le phénomène est un défaut de l'outil de test, pas de l'application :
`response.json: Protocol error (Network.getResponseBody): No resource with given identifier
found`. Les assertions lisaient le corps d'une réponse capturée par `page.waitForResponse()`
pendant un `page.goto()` : la navigation libère le corps côté CDP avant la lecture.

## Chronologie

| Date | Évènement |
|---|---|
| 2025-07-31 | `1cc2308e` introduit `admin.spec.ts` : cible « première ligne du tableau », bascule du statut sans restauration |
| 2025-08-21 | `74abc0bf` ajoute la bascule du rôle vers `PENDING`, avec restauration en fin de test |
| 2026-10-06 | `fc059963` ajoute `pnpm --filter @sirena/common build` au job E2E. Avant ce correctif le job cassait tôt ; les scénarios admin ne s'exécutaient pas |
| 2026-10-07 13:56 | Premier run avec le shard 1 en échec sur `admin.spec.ts` (run `37632612231`) |
| 2026-10-07 → 10-19 | Shard 1 en échec sur **au moins 13 runs** de `main`, un seul run vert constaté (`37908211468`, 10-09 08:57) |
| 2026-10-19 13:01 | Run `39256669557` : shards 2 et 3 verts, shard 1 rouge sur les deux scénarios d'`admin.spec.ts` (3 tentatives chacun) |
| 2026-10-19 ~15:00 | Signalement : « des comptes sont en attente d'habilitation, personne n'est à l'origine du changement de rôle » |
| 2026-10-19 ~15:45 | Cause identifiée. Hypothèse concurrente (régression de garde de route) écartée sur les logs de production |
| 2026-10-20 | Correctif écrit, `user17@yopmail.com` provisionné sur l'integration, et scénarios validés verts contre celle-ci (voir Validation) |

## Trace à l'origine du diagnostic

Run `39256669557`, job `E2E (shard 1/3)` :

```text
1) [Google Chrome] › tests/admin.spec.ts:125:3 › Administration des utilisateurs ›
   inverse le statut d'un utilisateur et le reflète dans le tableau
   Error: response.json: Protocol error (Network.getResponseBody): No resource with given identifier found
   > 148 | expect(userData.statutId).toBe(oppositeStatus);

2) [Google Chrome] › tests/admin.spec.ts:151:3 › Administration des utilisateurs ›
   change le rôle d'un utilisateur puis le remet à sa valeur d'origine
   Error: response.json: Protocol error (Network.getResponseBody): No resource with given identifier found
   > 175 | expect(updatedUser.roleId).toBe(oppositeRole);

3 failed, 16 passed (2.0m)
```

Les deux échecs tombent **après** l'écriture : le test n'atteint la ligne incriminée qu'après
`await expect(page).toHaveURL('/admin/users/all')`, et ce redirect n'a lieu que si la mutation
a réussi (`$userId.tsx`, `handleSubmit` sort en `catch` sans naviguer quand le PATCH échoue).

## Analyse technique

### 1. Une suite de tests sur un environnement partagé

Le job E2E écrit dans la base d'un environnement utilisé par de vrais agents, avec les droits
d'un `ENTITY_ADMIN`. Aucune isolation : ni base éphémère, ni compte cible dédié, ni jeu de
données propre au test. Les scénarios de requêtes, eux, respectent ce principe
(`tests/utils/requeteApi.ts` crée et détruit ses propres requêtes) — les scénarios admin
faisaient exception parce qu'il n'existe pas d'API de création d'utilisateur (un compte ne naît
qu'au premier login ProConnect).

**Leçon** : un test qui écrit doit posséder sa donnée. Quand il ne peut pas la créer, il ne devrait
pas tourner contre un environnement partagé.

### 2. Les retries transforment une invariance en dégradation

`playwright.config.ts` fixe `retries: 2` en CI. La valeur « d'origine » du rôle était relue
depuis l'interface **au début de chaque tentative**, donc dans l'état déjà corrompu par la
tentative précédente :

| Tentative | `originalRole` lu | `oppositeRole` posé | État laissé |
|---|---|---|---|
| 1 | rôle réel (ex. `READER`) | `PENDING` | `PENDING` |
| 2 | `PENDING` | `ENTITY_ADMIN` | `ENTITY_ADMIN` |
| 3 | `ENTITY_ADMIN` | `PENDING` | `PENDING` |

Le test ne restaure donc rien, et peut laisser le compte en `ENTITY_ADMIN` si la série
s'arrête sur un nombre pair de tentatives. Le scénario de statut souffre du même défaut, en
pire : il basculait `ACTIF` ↔ `INACTIF` **sans aucune restauration**, même en cas de succès.

**Leçon** : l'état à restaurer se capture une fois, avant toute écriture, et se restaure dans un
hook de teardown. Le relire depuis le système sous test en fait une variable, pas une référence.

### 3. Chaque run déplaçait la victime

L'onglet « Utilisateurs » exclut `PENDING` de sa requête (`allUsersTab.tsx`, `rolesToFilter`
passé en paramètre `roleId`). Un compte laissé en `PENDING` disparaît donc de la liste, et le
run suivant prend **le suivant dans l'ordre alphabétique des noms**. Le nombre de comptes
touchés croît avec le nombre de runs en échec, au lieu de rester à un.

À confirmer en base : les comptes concernés devraient être les premiers par `nom` croissant
dans le périmètre du compte de test.

### 4. Le formulaire d'administration réécrit les trois colonnes à chaque enregistrement

`$userId.tsx` envoie toujours `{ roleId, statutId, entiteId }`, même quand un seul champ a
changé, et le backend ne diffe que `entiteId` (`users.controller.ts`) : `roleId` et `statutId`
sont réécrits à chaque sauvegarde. Ce n'est pas la cause de l'incident, mais c'est ce qui en
maximise le rayon de dégâts — et le même mécanisme expose un administrateur humain à
rétrograder un compte sans l'avoir voulu, « En attente d'affectation » étant une option
réellement sélectionnable du menu Rôle (`getAssignableRoles` retourne tous les rôles de rang
inférieur ou égal, `PENDING` compris).

### 5. Un échec de CI rouge pendant 12 jours

Le shard 1 est rouge depuis le 07/10 sans traitement. L'échec était visible mais non alertant :
`fail-fast: false` sur la matrice, et aucun signal au-delà du statut du run.

**Leçon** : un job E2E qui écrit en base doit être traité comme un incident quand il échoue, pas
comme un test flaky à ignorer.

### 6. Le diagnostic a été ralenti par une piste plausible mais inactive

Une hypothèse concurrente a été sérieusement envisagée : `b5fd2181` (« deny route access when
the role is unknown », v1.21.0) renvoie désormais un rôle `null` vers `/inactive`, et
`2e573b75` (« revoke the auth token when its session is deleted », v1.22.0) invalide les jetons
émis avant son déploiement. La chaîne aurait affiché « en attente d'habilitation » sans aucune
écriture en base.

Elle a été écartée sur les logs : **aucune** occurrence de `Auth token is not
bound to an existing session` sur 6 h, et seules 11 `TokenExpiredError` nominales. La fragilité
reste réelle (voir actions) mais elle n'était pas active.

## Ce qui a bien fonctionné

- Le `ChangeLog` a fait son travail : les deux seuls chemins d'écriture de `User.roleId` sont
  tracés avec `changedById`, et le champ `before` permet une restauration exacte.
- Le cloisonnement des environnements a tenu : le job E2E n'a jamais pu atteindre la production.
- Les trois autres pistes structurelles (jobs d'anonymisation, migrations Prisma, seed) ont pu
  être écartées rapidement et avec certitude, l'audit ne laissant que deux chemins d'écriture
  possibles dans tout le backend.

## Correctif appliqué

- `apps/frontend/tests/utils/usersApi.ts` (nouveau) : lecture et écriture de l'habilitation via
  l'API, pour le teardown et les assertions.
- `apps/frontend/tests/admin.spec.ts` :
  - les deux scénarios mutants passent dans un `test.describe` dédié et ne visent plus qu'un
    **compte dédié**, jamais la première ligne de la liste : `user17@yopmail.com`, semé en cible
    locale et provisionné à la main sur l'integration, nommé par la variable
    `E2E_TARGET_USER_EMAIL`. Aucun autre test n'en dépend, et il ne détient aucun rôle dont le
    seed n'a qu'un seul porteur ;
  - l'habilitation d'origine est capturée **une seule fois** pour le fichier, jamais relue :
    une restauration qui échoue laisse le compte modifié, et la relire prendrait cet état
    pour l'original — le même piège que celui décrit au point 2 ;
  - la cible est résolue **avant toute écriture** : absente du périmètre du compte admin de test,
    le scénario échoue dans son `beforeEach` avec un message qui pointe le provisionnement, au
    lieu de se rabattre sur un autre compte ;
  - l'habilitation d'origine est capturée par l'API en `beforeEach` et restaurée par l'API en
    `afterEach`, donc même une assertion qui échoue ne laisse plus rien derrière ;
  - `PENDING` disparaît du scénario de rôle : il bascule entre `READER` et `WRITER`, ce qui
    couvre la même mécanique sans jamais rétrograder un compte ;
  - les lectures `page.waitForResponse(...).json()` sont remplacées par des appels API directs,
    ce qui supprime l'échec `Network.getResponseBody` à l'origine de l'incident.

- `apps/frontend/tests/admin.spec.ts`, suite : une sauvegarde attend désormais la réponse du
  `PATCH` et non une URL de redirection. `handleBack()` revient dans l'historique, donc la
  destination dépend du chemin d'accès au formulaire. Seul le **statut** de la réponse est lu,
  jamais son corps — un corps capturé à travers une navigation est libéré avant d'être parsé,
  ce qui est exactement le flake à l'origine de l'incident.

Les scénarios en lecture seule (onglets, navigation, ouverture du formulaire) continuent de
tourner contre l'integration, inchangés.

### Validation

`user17@yopmail.com` a été provisionné sur l'integration et habilité dans l'entité du compte
admin de test. Les scénarios mutants y tournent donc de nouveau, sur ce seul compte.

Trois exécutions successives contre l'integration ont démontré les trois propriétés visées,
dans cet ordre :

| Situation | Résultat |
|---|---|
| Cible absente du périmètre | 2 échecs dans le `beforeEach`, **aucune écriture**, 4 scénarios en lecture seule verts |
| Cible absente, teardown sans snapshot | plus de `User not found` trompeur empilé sur l'échec réel |
| Cible provisionnée | **6 scénarios verts**, habilitation de `user17` restaurée |

La première ligne est la propriété qui manquait : avant le correctif, ce même scénario
rétrogradait un agent réel.

## Actions à mener

- [x] Provisionner `user17@yopmail.com` sur l'integration et l'habiliter dans le périmètre du
      compte admin de test, avec la variable de dépôt `TEST_TARGET_USER_EMAIL` qui le nomme.
      Un compte SIRENA ne naissant qu'au premier login ProConnect, l'opération est manuelle et
      la CI n'en provisionne aucun. La cible n'a pas à s'authentifier ensuite : seul l'admin de
      test écrit sur elle
- [ ] Faire diffuser `roleId` et `statutId` par le backend comme il le fait déjà pour `entiteId`,
      pour qu'une sauvegarde n'écrive que ce qui change (réduit le rayon de dégâts et allège le
      `ChangeLog`)

Fragilité relevée au passage (hors incident) :

- [ ] `_auth/route.tsx` utilise `ensureQueryData`, qui rend le cache sans rejouer la `queryFn` :
      le store n'est alimenté que par l'effet de bord de `fetchProfile`. Réhydrater le store
      depuis la donnée rendue, ou passer `revalidateIfStale: true`
- [ ] `tanstackQuery.ts` invalide `['profileKey']` alors que la clé réelle est `['profile']`
      (`profile.hook.ts`), et le handler 401 vide le store sans vider le cache React Query
