# Pratiques de développement

Ce document décrit comment on développe sur Sirena : conventions de code, tests, revue,
sécurité, accessibilité, migrations, CI et travail avec des assistants.

Il complète deux documents qu'il ne répète pas : le [README](../README.md) pour la mise en route,
la stack et le catalogue de commandes, et [CONTRIBUTING.md](../CONTRIBUTING.md) pour le flux Git
(branches, nommage, commits, hooks, processus de PR).

## Structure du monorepo

La liste des espaces de travail, la stack et le catalogue de commandes sont dans le
[README](../README.md). Ce qui n'y figure pas, et qui coûte le plus de temps quand on l'ignore :

- **Ordre de build.** `@sirena/common`, `@sirena/db` et `@sirena/backend-utils` doivent être
  construits avant que `apps/backend` et `apps/frontend` typecheckent. Un typecheck sur un arbre
  non construit produit des centaines de fausses erreurs.
- **Client RPC.** Le client typé du frontend est dérivé du build backend : `pnpm build:backend`
  avant le premier `pnpm dev`.
- **Raccourcis pnpm.** Préférer `pnpm -r run <script>` à `pnpm <script>` : certains noms courts
  sont interceptés par pnpm lui-même et échouent pour une mauvaise raison.

## Conventions de code

Biome est la référence unique pour le formatage, le lint et le tri des imports — ni ESLint ni
Prettier dans le dépôt. Configuration racine : `biome.json`.

| Règle | Valeur |
| --- | --- |
| Indentation | 2 espaces |
| Largeur de ligne | 120 |
| Chaînes JS/TS | guillemets simples |
| Tri des imports | automatique (`assist.actions.source.organizeImports`) |
| Règles lint | `recommended` + domaine React complet |

Désactivations volontaires : `noForEach`, `useHookAtTopLevel`, `noRedundantRoles`,
`useComponentExportOnlyModules`, `noImportantStyles`. Les fichiers générés sont hors périmètre
(`*.gen.ts` du frontend, JSON Swagger, GraphQL généré, jeux de données géo du backend).

TypeScript tourne en `strict: true` partout. Le frontend ajoute `noUnusedLocals`,
`noUnusedParameters`, `noFallthroughCasesInSwitch`, `noUncheckedSideEffectImports`, et l'alias
`@/*` vers `src/`. Le backend est en `module: NodeNext` avec `verbatimModuleSyntax`.

Côté backend, une feature suit le découpage `route / controller / service / schema / type` :
le controller valide et orchestre, le service porte la logique et les accès Prisma.

Les versions de dépendances sont centralisées dans le `catalog:` de `pnpm-workspace.yaml` : un
package déclare `"react": "catalog:"` et la version se décide à un seul endroit. Deux garde-fous
s'y ajoutent :

- `minimumReleaseAge: 10080` — une version doit avoir 7 jours avant d'être installable ;
  `minimumReleaseAgeExclude` permet de déroger pour un correctif de sécurité récent.
- `overrides` — planchers de sécurité sur des paquets tirés transitivement, conservés même
  quand les ranges parents résolvent déjà une version saine.

Dependabot ouvre les montées de version chaque lundi, préfixées `chore(dependabot):`.

## Tests

| Type | Outil | Où |
| --- | --- | --- |
| Unitaires / intégration | Vitest | `apps/backend`, `apps/frontend`, `packages/common`, `packages/ui` |
| E2E | Playwright | `apps/frontend/tests` |
| Smoke backend | Vitest | `apps/backend` |
| Charge | k6 | `tests/load` |

La couverture backend se mesure avec `pnpm --filter @sirena/backend coverage` (v8). Les autres
commandes de test sont dans le [README](../README.md).

Points à connaître sur les E2E :

- Ils visent un environnement **déployé**, pas un serveur local : `FRONTEND_URI` pointe sur
  l'environnement d'intégration. En CI ils ne tournent que sur `main`, après le déploiement,
  en 3 shards.
- L'authentification ProConnect est lente et sujette aux limites de débit ; Playwright persiste
  le contexte navigateur dans `playwright/.auth/`. En cas de comportement étrange, supprimer ce
  dossier. Détail dans [apps/frontend/tests/README.md](../apps/frontend/tests/README.md).
- Les tests supposent des données présentes (au moins une requête, deux utilisateurs d'une même
  entité, rôle `ENTITY_ADMIN`) : `pnpm op:seed:e2e`.

## Revue de code

Le processus de PR est dans [CONTRIBUTING.md](../CONTRIBUTING.md). Côté contenu, les points
systématiquement regardés (voir `.agents/skills/code-review/SKILL.md`) :

- erreurs runtime : accès `null`/`undefined`, absence de garde, parsing non sûr ;
- requêtes Prisma : `select`/`include` manquants, `findMany` non borné, filtres incorrects ;
- sécurité : contrôle de rôle absent, gestion de fichiers non sûre, fuite de données ;
- compatibilité ascendante des API et respect de l'ordre des middlewares ;
- cohérence avec le découpage `route / controller / service / schema / type`.

## Base de données et migrations

Prisma, dans `packages/db` ; les commandes `db:*` sont listées dans le
[README](../README.md).

Une base de dev porte souvent des migrations de branches non encore mergées. Dans ce cas
`prisma migrate dev` propose un reset : ne pas l'accepter par réflexe — générer le SQL par diff
de schémas hors-ligne plutôt que perdre les données locales.

L'ERD est vérifié en CI (`pnpm db:erd:check`) : une migration qui change le schéma doit
s'accompagner de l'ERD régénéré.

## Intégration continue et déploiement

| Workflow | Déclencheur | Ce qu'il fait |
| --- | --- | --- |
| `lint-and-test.yaml` | chaque push | audit pnpm (non bloquant), gitleaks, lint, build, typecheck, tests unitaires |
| `auto-feature-branches.yaml` | push hors branches protégées | build des images Docker |
| `auto-deploy.yaml` | push sur `main`, `validation` | build, scan Trivy, déploiement GitOps, puis E2E sur `main` |
| `auto-test.yaml` | push sur `chore/deploy` | build et déploiement sur l'environnement de test |
| `security-scan.yaml` | push/PR sur `main`, hebdomadaire | scan Trivy du dépôt |
| `erd-diagram.yaml` | modification du schéma | vérification de l'ERD |
| `manual-deploy.yaml` | dispatch manuel sur un tag | déploiement vers `formation`, `preproduction` ou `production` |

`main` déploie sur l'environnement d'intégration et `validation` sur l'environnement de
validation ; les autres environnements ne se déploient que depuis un tag, à la demande. Les
images sont construites pour `backend`, `worker`, `frontend`, `anonymize` et
`sirec-restore`, publiées sur GHCR, puis déployées via le dépôt GitOps.

Le processus de mise en production est décrit dans [RELEASE_PROCESS.md](RELEASE_PROCESS.md).

## Sécurité

Le projet manipule des signalements et réclamations nominatifs : la sécurité n'est pas une
relecture de fin de cycle, elle fait partie de la définition de terminé.

- **Secrets.** Jamais de secret en dur, jamais dans un commit. Tout passe par les variables
  d'environnement (`.env` local, secrets GitHub et GitOps en déployé). Gitleaks tourne en
  pre-commit et en CI ; les faux positifs connus sont listés dans
  `gitleaks-ignored-secrets.json` (mise à jour via `pnpm gitleaks:update-ignored-secrets`). Un
  secret exposé est révoqué et tourné, pas seulement retiré du diff.
- **Validation aux frontières.** Toute entrée (corps de requête, paramètres, réponse d'API
  tierce, contenu de fichier) est validée par un schéma Zod avant traitement. Pas de `any` :
  `unknown` plus un garde de type.
- **Autorisation explicite.** Chaque route porte son contrôle de rôle et de périmètre d'entité.
  Le filtrage par périmètre se fait côté serveur, jamais par masquage dans l'UI. Voir
  [entities_rights_access.md](entities_rights_access.md).
- **Requêtes Prisma.** `select`/`include` explicites, jamais de `findMany` non borné, pagination
  systématique sur les listes. Les requêtes brutes sont paramétrées.
- **Fichiers téléversés.** Type et taille vérifiés, contenu analysé (ClamAV), stockage hors de
  l'arborescence servie, noms non réutilisés tels quels. Voir
  [file-upload-flow.md](file-upload-flow.md).
- **Messages d'erreur.** Utiles côté utilisateur, détaillés seulement dans les logs serveur :
  pas de trace ni de détail d'implémentation renvoyé au client.
- **Dépendances.** `pnpm audit` en CI (non bloquant, mais suivi), Trivy sur le dépôt et sur les
  images, Dependabot hebdomadaire, `minimumReleaseAge` pour ne pas installer une version le jour
  de sa publication.
- **En-têtes HTTP.** `nginx/frontend.conf` pose `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN` et une
  `Permissions-Policy` restrictive, et masque la bannière serveur. Il n'y a pas de
  Content-Security-Policy applicative à ce jour : c'est un manque identifié, et toute nouvelle
  origine externe (police, CDN, API) devra y être déclarée le jour où elle est ajoutée.

## Accessibilité

Service public : le RGAA s'applique. Le design system DSFR (`@codegouvfr/react-dsfr`) couvre
l'essentiel à condition de ne pas le contourner.

- Utiliser les composants DSFR plutôt que réimplémenter un équivalent stylé.
- HTML sémantique d'abord : `header`, `nav`, `main`, `section`, `button` — pas une pile de `div`
  avec des gestionnaires de clic.
- Toute action doit être atteignable au clavier, avec un focus visible.
- Libellés, `aria-label` et messages d'erreur de formulaire liés au champ concerné.
- Les états de chargement et les erreurs sont annoncés, pas seulement affichés.
- Respecter `prefers-reduced-motion` sur les animations.
- Les règles a11y de Biome sont actives (domaine React) : un avertissement a11y se corrige, il
  ne se désactive pas au cas par cas.

## Observabilité et gestion des erreurs

- Sentry est branché côté frontend (`@sentry/react`) et backend ; les sourcemaps sont envoyées à
  la construction de l'image. Le triage des erreurs passe par l'instance
  `sentry2.fabrique.social.gouv.fr` (serveur MCP déclaré dans `.mcp.json`).
- Les logs serveur sont structurés et contextualisés (`LOG_EXTRA_CONTEXT`) ; ils ne contiennent
  ni secret ni donnée personnelle superflue.
- Les erreurs sont traitées explicitement à chaque niveau : pas de `catch` vide, pas de promesse
  non gérée. Une erreur attrapée est soit résolue, soit enrichie et relancée.
- Les tableaux de bord Grafana et les alertes vivent dans `docs/grafana_dashboards/`.

## Documentation et décisions

- Une décision structurante s'écrit dans [adr.md](adr.md) : contexte, options considérées,
  décision, conséquences. Une ADR n'est pas réécrite après coup, elle est remplacée par une
  nouvelle qui la supersede.
- Les fonctionnalités à déploiement progressif passent par les feature flags
  ([feature-flags.md](feature-flags.md)) plutôt que par des branches longues.
- La documentation d'une fonctionnalité vit à côté du code dans `docs/`, pas dans un outil
  externe. Ce qui n'est pas dans le dépôt se périme.
- Les commentaires expliquent le *pourquoi*, pas le *quoi* : un commentaire qui paraphrase le
  code suivant est du bruit ; un commentaire qui explique une contrainte non évidente (une
  version épinglée, un contournement, un ordre imposé) a de la valeur.

## Qualité de code au quotidien

Ces règles ne sont pas outillées, elles relèvent de la revue :

- Fichiers courts et cohésifs (200 à 400 lignes typiques, 800 en limite haute), fonctions sous
  50 lignes, pas plus de quatre niveaux d'imbrication.
- Sorties anticipées et clauses de garde plutôt que des blocs `if` imbriqués.
- Immutabilité par défaut : produire une nouvelle valeur plutôt que muter un objet reçu.
- Pas de valeur codée en dur : constante nommée ou configuration.
- Pas de `console.log` ni de code de débogage laissé dans une PR.
- Dériver plutôt que dupliquer un état : ne pas recopier un état serveur dans un store client.
- L'état partageable (filtres, tri, pagination, onglet actif) vit dans l'URL.

## Assistants LLM

Le dépôt est conçu pour être travaillé avec des assistants de code, sans en privilégier un :
[AGENTS.md](../AGENTS.md) suit une spécification ouverte, lisible par plusieurs outils. Les
conventions ci-dessous valent pour l'humain qui pilote autant que pour l'agent.

**Instructions versionnées.** Les consignes destinées aux agents vivent dans le dépôt et sont
revues comme du code : `AGENTS.md` décrit le format des skills, et
`.agents/skills/<nom>/SKILL.md` porte les procédures réutilisables (revue de code, Hono, triage
Sentry). Une instruction utile à toute l'équipe va dans le dépôt, pas dans une configuration
locale.

**Contexte plutôt que volume.** Un agent est d'autant plus fiable qu'il reçoit le bon contexte :
pointer les fichiers pertinents, la documentation de la fonctionnalité, la convention à suivre.
Le dépôt déclare dans `.mcp.json` le serveur MCP Sentry, pour travailler sur les erreurs réelles
plutôt que supposées ; pour les bibliothèques, préférer de même une source de documentation à
jour à une API mémorisée et périmée.

**L'agent propose, la CI et la revue disposent.** Aucune sortie d'agent n'est fusionnée sans
relecture humaine ni pipeline vert. Le même modèle qui écrit le code est mauvais juge de ce
code : la revue utile vient d'un humain, ou au minimum d'un second passage avec un contexte
distinct.

**Pratiques recommandées.**

- Planifier avant d'écrire sur les tâches non triviales : faire produire un plan, le corriger,
  puis lancer l'implémentation. Un plan faux coûte moins cher à jeter qu'une implémentation.
- Travailler par petites étapes vérifiables, avec des points de contrôle exécutables (tests,
  typecheck, lint) plutôt qu'une grande passe en fin de course.
- Tests d'abord quand c'est possible : un test qui échoue avant la correction est la meilleure
  preuve que le correctif traite le vrai problème.
- Faire vérifier plutôt que croire : demander l'exécution des tests et le résultat réel, pas une
  affirmation de réussite. Traiter une erreur de type ou de test comme un signal, pas comme un
  obstacle à contourner (ni `any`, ni test affaibli pour passer au vert).
- Limiter le périmètre d'une session à une tâche : plusieurs sujets dans le même contexte
  dégradent la qualité et rendent la revue difficile.
- Isoler les travaux parallèles dans des worktrees Git distincts pour éviter les collisions.
- Relire le diff comme n'importe quel diff : code mort, abstraction prématurée, dépendance
  ajoutée sans nécessité, duplication d'un utilitaire existant sont les défauts les plus
  fréquents.
- Ne jamais donner à un agent un secret réel, et ne jamais lui faire exécuter une action
  irréversible (déploiement, migration en production, force-push) sans validation explicite.

**Pas de mention de modèle ni d'outil dans le livrable.** Le dépôt ne fait pas la publicité d'un
fournisseur de modèles. Concrètement :

- Aucune mention d'un modèle ou d'un assistant dans les messages de commit : pas de ligne
  `Co-Authored-By` vers un assistant, pas de mention « generated with », pas d'emoji ni de
  signature d'outil. Un commit suit la convention du dépôt, et rien d'autre.
- Aucune mention dans le code, les commentaires, les noms de branche, les descriptions de PR ou
  la documentation. Un commentaire explique une contrainte technique, pas la façon dont la ligne
  a été produite.
- La responsabilité du contenu est celle de l'auteur de la PR, quel que soit l'outil utilisé pour
  l'écrire. C'est précisément pourquoi l'outil n'a pas à être crédité : il n'engage personne.
- Cette règle vaut aussi pour les fichiers de configuration d'agents ajoutés au dépôt : on y
  décrit les pratiques du projet, pas un produit.
