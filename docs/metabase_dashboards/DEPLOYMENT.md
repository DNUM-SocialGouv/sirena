# Mise en production d'un dashboard Metabase

Ce document décrit comment **propager un dashboard Metabase d'un environnement à l'autre**
jusqu'à la production, et fournit la **checklist** à dérouler à chaque passage. Il complète
[FILTERS.md](./FILTERS.md), qui explique le fonctionnement des filtres et la façon de les
configurer ; ici on ne parle que de la **copie** et de sa **vérification**.

---

## 1. Principes

### Une seule source : integration

Le dashboard de référence est celui de l'environnement **integration**. C'est lui qui est
développé, recetté au fil de l'eau et **versionné dans le dépôt** sous
`docs/metabase_dashboards/<id>/` (`pnpm op:metabase:export-dashboard <id>`).

Chaque environnement cible est **toujours copié depuis integration**, jamais depuis
l'environnement précédent :

```text
                 ┌──► validation
                 ├──► formation
integration ─────┼──► preproduction
 (source unique) └──► production
```

Copier « en cascade » (validation → formation → …) accumulerait les écarts : un oubli sur
validation se retrouverait sur tous les suivants, et le dashboard de production ne
ressemblerait plus au snapshot du dépôt. En repartant à chaque fois de la même source, une
erreur reste locale à un environnement et le diff avec le snapshot reste lisible.

L'**ordre de promotion** reste néanmoins : validation → formation → preproduction →
production. On ne touche pas à la production tant que la copie n'a pas été validée sur les
environnements précédents.

### Ce que l'application lit réellement dans Metabase

Sirena n'affiche pas d'iframe : le backend interroge l'API d'embedding signé et le front
rend les données avec ses propres composants. La copie doit donc être fidèle sur tout ce
que le code consomme, et pas seulement sur le SQL :

| Élément Metabase | Utilisation dans Sirena | Conséquence d'un écart |
| --- | --- | --- |
| Nom de la carte | Titre affiché sur `/statistiques` | Titre différent d'un environnement à l'autre |
| Description de la carte | Infobulle d'aide à côté du titre | Aide absente ou obsolète |
| Type de visualisation (`display`), y compris la surcharge posée sur la dashcard | Choix du composant (KPI, tableau, graphique) | Un KPI rendu en tableau, ou l'inverse |
| Alias des colonnes SQL et renommages (`column_settings`) | En-têtes des tableaux, détection de la colonne « % » | Pourcentages recalculés à tort, en-têtes techniques |
| Grille (`row`, `col`, `size_x`, `size_y`) | Ordre et disposition des cartes | Page réorganisée |
| Paramètres du dashboard (`slug`, type, multi-sélection) | Découverte dynamique des filtres transmis | Filtre silencieusement ignoré |
| Mapping paramètre → carte | Application du filtre à chaque carte | Chiffres incohérents entre cartes, **sans erreur** |
| Visibilité d'embedding (Locked / Enabled / Disabled) | Token JWT vs query string | Périmètre de sécurité cassé, ou dashboard en 503 |
| Base de données de la carte | Données interrogées | Chiffres d'un autre environnement |

### Deux dashboards par environnement

Chaque environnement porte **deux** dashboards, repérés par un préfixe `[env]` dans leur nom :

| Dashboard | Utilisateurs | Particularité |
| --- | --- | --- |
| `[env] Dashboard local` | Rattachés à une entité | `entity_label` en **Locked** (périmètre imposé par le serveur) |
| `[env] Dashboard national` | Nationaux | `entity_label` en **Disabled** (vue nationale, pas de périmètre) |

La procédure ci-dessous est à dérouler **pour chacun des deux**.

---

## 2. Prérequis

- Le snapshot du dépôt est **à jour** : exporter integration et vérifier que `git diff` est
  vide. Si ce n'est pas le cas, c'est que la source a bougé sans passer par une PR — régler ça
  d'abord (export + PR), on ne copie pas un dashboard dont on ne connaît pas l'état.
- Si la mise en production s'accompagne d'un **changement de code** (nouveau filtre, nouvelle
  colonne reconnue par le front), le code est déployé **avant** la configuration Metabase :
  c'est le déploiement en deux temps décrit dans FILTERS.md. Le backend ignore les filtres
  que le dashboard ne déclare pas encore, l'inverse n'est pas vrai.
- Un compte Metabase ayant le droit d'écrire dans les collections cible.
- Connaître la **connexion de base de données** de l'environnement cible dans Metabase
  (Admin → Bases de données). Le nom doit contenir l'environnement sans ambiguïté.
- Deux fenêtres côte à côte : la source à gauche, la cible à droite. On copie carte par
  carte, on ne fait pas confiance à sa mémoire.

---

## 3. Étapes

### Étape 1 — Figer la source

1. Exporter integration : `pnpm op:metabase:export-dashboard <id_local>` puis
   `pnpm op:metabase:export-dashboard <id_national>`.
2. `git status` doit être propre. Sinon : ouvrir une PR avec le diff, la faire relire, la
   merger. Le snapshot mergé est la définition de ce qui part en production.
3. Noter le nombre de cartes de chaque dashboard et la liste des paramètres (`slug`) :
   c'est le référentiel à retrouver à l'identique sur la cible.

### Étape 2 — Copier les cartes

Pour **chaque carte** du dashboard source, dans la cible :

1. Créer ou ouvrir la carte cible dans la **collection** de l'environnement.
2. Sélectionner la **base de données de l'environnement cible** dans l'éditeur SQL. Une carte
   dupliquée depuis integration garde la base d'integration : la changer explicitement.
3. Coller le **SQL** de la carte source, à l'identique. Les alias de colonnes font partie du
   contrat avec le front : ne pas les modifier au passage.
4. Reconfigurer **chaque variable** (template tag) créée par le collage. Coller du SQL
   régénère les tags **avec des réglages par défaut** : type, obligatoire, valeur par défaut
   et « plusieurs valeurs » sont **perdus** et à remettre conformément à la source. Les
   réglages attendus par filtre sont dans FILTERS.md.
5. Reporter le **nom** et la **description** de la carte, à la lettre.
6. Reporter le **type de visualisation** et ses réglages : renommages de colonnes, format des
   nombres, type sémantique « pourcentage », etc.
7. Exécuter la carte avec une valeur de test pour chaque variable : elle doit renvoyer des
   données, sans erreur SQL, sur la base cible.

Archiver les cartes de la cible qui n'existent plus dans la source plutôt que de simplement
les retirer du dashboard.

### Étape 3 — Copier le dashboard

1. Nom : `[env] Dashboard local` ou `[env] Dashboard national`. Description identique à la
   source.
2. **Paramètres** (filtres) du dashboard, dans le même ordre que la source. Pour chacun :
   libellé, **slug** (à vérifier dans l'export : Metabase le dérive du libellé), type,
   sélection multiple, valeur par défaut, et **source des valeurs** :
   - liste statique → recopier la liste ;
   - **valeurs issues d'une carte** (cas du dropdown `entity_label`, alimenté par une carte
     dédiée) → pointer sur la carte **de l'environnement cible**, elle-même branchée sur la
     base cible. L'identifiant de carte stocké dans `values_source_config.card_id` est propre
     à chaque environnement : un dropdown qui « marche » mais liste les entités d'integration
     est le symptôme d'un oubli ici.
3. **Mapper chaque paramètre sur chaque carte** concernée. Un mapping manquant ne produit
   aucune erreur : la carte ignore le filtre et les chiffres deviennent incohérents entre
   eux. Compter les mappings : sur integration, chaque carte est mappée sur les cinq
   paramètres.
4. Reproduire la **grille** : position et taille de chaque carte, à l'identique de la
   source (les valeurs `row`, `col`, `size_x`, `size_y` de l'export font foi). Vérifier les
   surcharges de visualisation posées au niveau de la dashcard (une carte affichée en
   « nombre » sur le dashboard mais enregistrée en tableau, par exemple).
5. **Embedding** : activer l'embedding sur le dashboard, puis régler la visibilité de chaque
   paramètre exactement comme la source : `entity_label` **Locked** sur le local, **Disabled**
   sur le national ; les filtres de consultation (`start_date`, `end_date`,
   `domaine_fonctionnel`, `inclure_eig`) **Enabled**. Un paramètre déclaré mais non Enabled
   risque de faire tomber tout le dashboard en 503 côté application (cf. FILTERS.md, § 4 bis).
6. Réglages annexes à aligner : application automatique des filtres, durée de cache,
   onglets (aucun sur integration), collection et droits d'accès du groupe qui consulte.

### Étape 4 — Vérifier dans l'application

Sur l'environnement cible :

- Ouvrir `/statistiques` avec un utilisateur **rattaché à une entité** : le dashboard local
  s'affiche, toutes les cartes attendues sont présentes, dans le bon ordre, avec titres et
  infobulles.
- Ouvrir la même page avec un utilisateur **national** : le dashboard national s'affiche.
- Jouer chaque filtre (période, domaine fonctionnel multiple, exclusion des EIG) et
  constater que **toutes** les cartes bougent ensemble. Une carte qui ne bouge pas est une
  carte non mappée.
- Recouper au moins un KPI avec une requête SQL directe sur la base cible, pour une entité
  et une période données.
- Vérifier l'absence d'erreurs côté backend (logs, Sentry) pendant ces manipulations.

### Étape 5 — Clôturer

- Noter dans le ticket de mise en production : environnement, identifiants des deux
  dashboards, date, et référence du commit du snapshot copié.
- Si la copie a révélé une erreur **dans la source**, la corriger sur integration, ré-exporter,
  PR, puis reprendre la copie depuis l'étape 1 sur les environnements déjà traités.

---

## 4. Checklist

À copier dans le ticket, une fois par environnement et par dashboard.

```markdown
## Mise en production dashboard Metabase — <env> — <local | national>

### Source
- [ ] Snapshot integration exporté, `git status` propre (commit : `<sha>`)
- [ ] Nombre de cartes attendu : <n> — paramètres attendus : <slugs>
- [ ] Le code applicatif nécessaire est déjà déployé sur <env>

### Cartes (une ligne par carte)
| Carte | Base cible | SQL identique | Variables reconfigurées (type, obligatoire, défaut, multi) | Nom | Description | Visualisation + colonnes | Exécution OK |
| --- | --- | --- | --- | --- | --- | --- | --- |
| <nom> | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |

- [ ] Cartes obsolètes archivées

### Dashboard
- [ ] Nom `[<env>] Dashboard <local|national>` et description identiques
- [ ] Paramètres : libellé, slug, type, multi-sélection, défaut conformes
- [ ] Source des valeurs des dropdowns : carte de l'environnement cible, sur la base cible
- [ ] Chaque paramètre mappé sur chaque carte (compter les mappings)
- [ ] Grille identique (position et taille de chaque carte)
- [ ] Surcharges de visualisation au niveau dashcard reportées
- [ ] Embedding activé
- [ ] Visibilité : `entity_label` Locked (local) / Disabled (national), autres filtres Enabled
- [ ] Filtres auto-appliqués, cache, onglets, collection et droits alignés

### Vérification
- [ ] `/statistiques` OK avec un utilisateur d'entité (dashboard local)
- [ ] `/statistiques` OK avec un utilisateur national (dashboard national)
- [ ] Chaque filtre fait bouger toutes les cartes
- [ ] Un KPI recoupé par requête SQL directe sur la base cible
- [ ] Aucune erreur backend / Sentry pendant la recette

```

---

## 5. Pièges connus

- **Coller du SQL réinitialise les variables.** C'est le piège le plus fréquent : la
  requête est bonne, mais `domaine_fonctionnel` n'accepte plus plusieurs valeurs, ou
  `entity_label` n'est plus obligatoire. Toujours repasser sur chaque variable après collage.
- **Une carte dupliquée garde la base d'origine.** Les chiffres semblent cohérents puisque
  la carte tourne, mais ils viennent d'integration.
- **Un mapping oublié ne casse rien de visible.** Le seul symptôme est une carte qui ne
  réagit pas au filtre. D'où la vérification « chaque filtre fait bouger toutes les cartes ».
- **Le slug est dérivé du libellé.** Renommer un filtre « Domaine fonctionnel » en « Domaines
  fonctionnels » change le slug, et le backend ne le transmet plus. Vérifier le slug dans
  l'export, pas dans l'interface.
- **Disabled n'est pas un interrupteur.** Un paramètre déclaré sur le dashboard mais réglé
  Disabled en embedding peut être transmis en query string par le backend, que Metabase
  refuse alors (503). Pour désactiver un filtre, le retirer du dashboard.
- **La source d'un dropdown est un identifiant de carte.** Elle ne se copie pas : elle se
  rebranche sur la carte équivalente de l'environnement cible.
- **Les identifiants ne sont pas stables entre environnements.** Ne jamais s'y référer dans
  la doc ou les tickets sans préciser l'environnement.
