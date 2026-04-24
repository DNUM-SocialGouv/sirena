# Feature Flags

Système de feature flags permettant d'activer ou désactiver des fonctionnalités de manière ciblée : pour tout le monde, pour des utilisateurs spécifiques, ou pour des entités spécifiques.

## Administration

L'interface d'administration est accessible à `/admin/feature-flags` (super administrateurs uniquement).

Chaque flag possède :

| Champ | Description |
|-------|-------------|
| `name` | Identifiant unique (ex: `NEW_DASHBOARD`) |
| `description` | Description libre |
| `enabled` | Activation globale (quand aucun ciblage n'est défini) |
| `userEmails` | Liste d'emails utilisateurs ciblés |
| `entiteIds` | Liste d'IDs entités ciblées |

## Logique de résolution

La résolution d'un flag suit cet ordre :

1. **Flag introuvable** → retourne la valeur par défaut
2. **`userEmails` contient l'email de l'utilisateur** → `true`
3. **`entiteIds` contient l'entité de l'utilisateur** → `true`
4. **Aucun ciblage défini** (`userEmails` et `entiteIds` vides) → valeur de `enabled`
5. **Sinon** → `false`

Le ciblage est combinable (OR) : un flag peut cibler à la fois des utilisateurs ET des entités. Il suffit qu'une des conditions soit remplie.

## Utilisation côté frontend

### Hook `useHasFeature`

```tsx
import { useHasFeature } from '@/hooks/useHasFeature';

function MonComposant() {
  const showNewDashboard = useHasFeature('NEW_DASHBOARD', false);

  if (!showNewDashboard) {
    return <AncienDashboard />;
  }

  return <NouveauDashboard />;
}
```

Le second paramètre est la **valeur par défaut** utilisée si le flag n'existe pas en base.

### Chargement automatique

Les flags sont automatiquement chargés au login (via `fetchProfile`). Aucune action supplémentaire n'est nécessaire.

## Utilisation côté backend

### Helper `hasFeature`

```ts
import { hasFeature } from '../featureFlags/featureFlags.service.js';

// Dans un controller ou service
const userId = c.get('userId');
const user = await getUserById(userId, null, null);

if (await hasFeature('NEW_EXPORT_FORMAT', false, user?.email ?? '', user?.entiteId ?? null)) {
  // Logique de la nouvelle fonctionnalité
}
```

**Signature :**

```ts
hasFeature(name: string, defaultValue: boolean, userEmail: string, entiteId: string | null): Promise<boolean>
```

## Ajouter un nouveau feature flag

### 1. Déclarer la constante

Dans `packages/common/src/constants/featureFlag.constant.ts` :

```ts
export const FEATURE_FLAGS = {
  NEW_DASHBOARD: 'NEW_DASHBOARD',
} as const;
```

### 2. Créer le flag en base

Via l'interface admin (`/admin/feature-flags`) ou directement en base :

```sql
INSERT INTO "FeatureFlag" (id, name, description, enabled, "userEmails", "entiteIds")
VALUES (gen_random_uuid(), 'NEW_DASHBOARD', 'Nouveau tableau de bord', false, '{}', '{}');
```

### 3. Utiliser dans le code

```tsx
import { FEATURE_FLAGS } from '@sirena/common/constants';
import { useHasFeature } from '@/hooks/useHasFeature';

const isEnabled = useHasFeature(FEATURE_FLAGS.NEW_DASHBOARD, false);
```

## Exemples de ciblage

### Activer pour tout le monde

```
enabled: true
userEmails: []
entiteIds: []
```

### Activer pour des utilisateurs spécifiques (beta testers)

```
enabled: false
userEmails: ["jean.dupont@sante.gouv.fr", "marie.martin@sante.gouv.fr"]
entiteIds: []
```

### Activer pour une entité (ex: ARS Normandie)

```
enabled: false
userEmails: []
entiteIds: ["uuid-ars-normandie"]
```

### Activer pour une entité + quelques utilisateurs hors entité

```
enabled: false
userEmails: ["jean.dupont@sante.gouv.fr"]
entiteIds: ["uuid-ars-normandie"]
```

Ici, tous les utilisateurs de l'ARS Normandie **et** `jean.dupont@sante.gouv.fr` auront accès à la fonctionnalité.

## API

| Méthode | Route | Accès | Description |
|---------|-------|-------|-------------|
| `GET` | `/api/feature-flags` | SUPER_ADMIN | Liste tous les flags |
| `POST` | `/api/feature-flags` | SUPER_ADMIN | Crée un flag |
| `PATCH` | `/api/feature-flags/:id` | SUPER_ADMIN | Met à jour un flag |
| `DELETE` | `/api/feature-flags/:id` | SUPER_ADMIN | Supprime un flag |
| `GET` | `/api/feature-flags/resolve` | Authentifié | Résout les flags pour l'utilisateur courant |
