# README — Gestion des entités et cloisonnement des requêtes

## 🧭 Contexte

Dans le modèle de données de Sirena, les “requêtes” et leurs “traitements” (étapes, notes, fichiers, etc.) sont liés à des entités administratives hiérarchisées.

Chaque “entité” peut être :
- une “Agence Régionale de Santé” (ARS) ou un “Conseil Départemental” (CD) → niveau le plus haut
- une “Direction”
- un “Service”

---

## ⚙️ Nouvelle logique métier

### Principe central
Toute requête et tout traitement sont désormais rattachés à l’entité la plus haute de la hiérarchie (souvent une ARS/CD).

Autrement dit :
- Une requête appartient toujours à une ARS/CD.
- Les étapes, notes, et pièces jointes associées à cette requête sont liées à la même ARS/CD.
- Tous les agents appartenant à cette ARS/CD (ou à ses directions et services descendants) peuvent voir et traiter cette requête.
- Les autres ARS/CD n’ont aucun accès à cette requête ni à ses traitements (sauf dans le cas où elle est aussi explicitement lié à la requête).

---

## 🔒 Cloisonnement fonctionnel

| Élément | Niveau de cloisonnement |
|----------|--------------------------|
| Requête | Par “entité la plus haute” (ARS/CD) |
| Étapes de traitement | Par “entité la plus haute” (ARS/CD) |
| Notes | Par “entité la plus haute” (ARS/CD) |
| Fichiers | Par “entité la plus haute” (ARS/CD) |

Ainsi, le “traitement d’une requête” est mutualisé entre l’ARS/CD et tous ses services/directions.

---

## 🧩 Exemple concret

### Structure hiérarchique

```
ARS Normandie
 ├── Direction Territoriale du Calvados
 │    ├── Service RH
 │    └── Service Financier
 └── Direction Territoriale de la Manche
```

### Cas d’usage
- Une requête est affectée à ARS Normandie.
- Les agents du Service RH, Service Financier ou Direction du Calvados voient la même requête et les mêmes étapes.
- Les agents d’une autre ARS (ex. ARS Bretagne) ne voient rien (sauf dans le cas où elle est aussi explicitement lié à la requête).

---

## 🛠️ Gestion des entités — filtre administrateur

Dans l’espace administrateur, l’onglet “Gestion des entités” permet aux super admin de consulter et modifier les entités administratives.

Le filtre “Entité administrative” de cet écran désigne uniquement les entités racines de la hiérarchie, c’est-à-dire les entités sans entité mère.

Lorsqu’une ou plusieurs entités racines sont sélectionnées :
- le tableau affiche chaque entité racine sélectionnée.
- il affiche aussi toutes ses Directions et tous ses Services descendants.
- le résultat conserve l’ordre global du tableau d’administration.
- le filtre est porté par le query param `rootEntiteIds` au format CSV.

Les Directions et Services ne sont pas proposés comme options de ce filtre. Un identifiant invalide ou ne correspondant pas à une entité racine ne doit pas bloquer l’affichage : il ne produit simplement aucun résultat pour cet identifiant.

---

## 💾 Implémentation technique

### Base de données

| Table | Champ clé | Règle |
|--------|------------|-------|
| RequeteEntite | entiteId | Toujours l’ARS/CD (top-level entity) |
| RequeteEtape | entiteId | Toujours l’ARS/CD |
| RequeteEtapeNote | hérite de RequeteEtape | Toujours l’ARS/CD |
| UploadedFile | hérite de RequeteEtape | Toujours l’ARS/CD |

### Contexte d’authentification

Lorsqu’un utilisateur se connecte :
- On calcule son entité la plus haute (topEntiteId) grâce à la hiérarchie (entiteMereId).
- Cette valeur est stockée dans le contexte (context.topEntiteId).
- Toutes les lectures et écritures de requêtes ou d’étapes utilisent topEntiteId comme référence unique.

### Accès et visibilité

- Un agent voit une requête si et seulement si il appartient à la hiérarchie de l’entité ARS/CD liée à cette requête.
- Les traitements (RequeteEtape, Notes, Fichiers) sont visibles et modifiables uniquement dans ce même périmètre.
