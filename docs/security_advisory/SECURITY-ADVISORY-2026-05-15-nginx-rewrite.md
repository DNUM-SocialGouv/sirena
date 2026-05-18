# Rapport de sécurité — Heap buffer overflow nginx `ngx_http_rewrite_module` (CVE-2026-42945)

**Date du rapport** : 2026-05-15
**Auteur** : Gaël, assisté par Claude Opus
**Statut Sirena** : 🟡 Configuration applicative **non vectrice directe**, mais dépendance à la version nginx de l'ingress-controller (hors de notre périmètre). Action : confirmation à demander à l'équipe ops.

---

## 1. Résumé exécutif

Le module `ngx_http_rewrite_module` de nginx (Open Source et Plus) contient un **heap buffer overflow** déclenchable par requête HTTP non authentifiée. Le bug s'active lorsque la configuration nginx réunit toutes ces conditions :

1. Une directive `rewrite`
2. Suivie d'une autre directive `rewrite`, `if` ou `set`
3. Contenant un capture group PCRE anonyme (`$1`, `$2`, …)
4. **ET** un `?` dans la chaîne de remplacement

**Impact**
- Crash du worker nginx (redémarrage automatique → DoS si exploité en boucle)
- RCE possible sur les systèmes avec ASLR désactivée

**Severity** : élevée. Non authentifié, déclenchable par requête HTTP forgée vers tout vhost servi par un nginx vulnérable.

**Statut Sirena** : la chaîne de remplacement `rewrite-target: /$1` configurée sur l'ingress `backend` (cf §4) **ne contient pas de `?`** et n'est donc **pas vectrice directe** du bug. Mais nginx est partagé par toutes les ingresses du cluster — un crash worker affecte l'ensemble des locataires. La version de nginx embarquée dans `ingress-nginx-controller` doit être confirmée par l'équipe qui le gère.

---

## 2. Détails techniques

### Composant affecté

- **Projet** : nginx (Open Source et Plus)
- **Module** : `ngx_http_rewrite_module`
- **Type** : heap buffer overflow

### Versions vulnérables (tracker Debian)

| Distribution | Version vulnérable |
|---|---|
| bullseye | 1.18.0-6.1+deb11u3, u5 |
| bookworm | 1.22.1-9+deb12u3, u4 |
| trixie | 1.26.3-3+deb13u2 |
| forky | 1.30.0-2 |
| unstable (fixed) | 1.30.0-3 |

Toutes les distributions amont incluant nginx avant le correctif sont concernées. Pour `ingress-nginx-controller`, la version nginx embarquée est figée dans l'image conteneur et dépend du tag du controller.

### Vecteur d'attaque

Requête HTTP forgée vers un vhost dont la configuration nginx réunit les 4 conditions du §1. L'attaquant n'a pas besoin de contrôler la config — seulement de pouvoir atteindre le vhost vulnérable.

---

## 3. Configuration Sirena exposée

### Ingress `backend` (`helm_charts/charts/backend/values.yaml`)

```yaml
ingress:
  appAnnotations:
    nginx.ingress.kubernetes.io/rewrite-target: /$1
    nginx.ingress.kubernetes.io/use-regex: 'true'
  paths:
    - path: /api/(.*)
      pathType: ImplementationSpecific
```

Analyse face aux 4 conditions du bug :

| Condition | Statut |
|---|---|
| Une directive `rewrite` | ✅ générée par `rewrite-target` |
| Suivie d'une autre `rewrite`/`if`/`set` | ⚠️ dépend de la config globale de l'ingress-controller (TLS redirect, snippets, etc.) |
| Capture group anonyme `$1` dans la replacement | ✅ `$1` présent |
| `?` dans la chaîne de remplacement | ❌ **absent** |

**Conclusion** : notre ingress prise isolément ne génère pas le pattern complet. La condition 4 (`?` dans le replacement) n'est pas satisfaite. Mais on ne maîtrise pas l'intégralité du `nginx.conf` produit par le controller.

### Autres ingresses du repo

Audit exhaustif réalisé le 2026-05-15 :

```bash
grep -r "rewrite-target" helm_charts/
# → helm_charts/charts/backend/values.yaml:108: nginx.ingress.kubernetes.io/rewrite-target: /$1
```

**Un seul `rewrite-target` dans tout le repo**, celui du chart `backend` analysé ci-dessus. Aucun autre chart (frontend, etc.) n'utilise cette annotation. ✅

---

## 4. Vérifications à faire (accès cluster limité)

> Contexte : on a accès à nos propres déploiements et à leurs ingresses, mais pas au namespace `ingress-nginx` ni au pod controller. L'objectif est de **confirmer** ou **infirmer** que le nginx servant nos vhosts est patché.

Pas 36 solutions, il faut demander à l'équipe ops de vérifier de leur coté.

---

## 5. Statut Sirena — détail

| Vérification | Résultat |
|---|---|
| `rewrite-target` du chart `backend` contient un `?` | ❌ non (`/$1`) |
| Autres chart helm avec `rewrite-target` problématique | ✅ aucun autre `rewrite-target` dans `helm_charts/` (audit 2026-05-15) |
| Version nginx du controller | ⏳ à confirmer par l'équipe ops |

**Action immédiate** : remonter la CVE à l'équipe ops avec demande de confirmation §4.

---

## 6. Références

- [CVE-2026-42945 — Debian security tracker](https://security-tracker.debian.org/tracker/CVE-2026-42945)
- [nginx changelog](https://nginx.org/en/CHANGES)
