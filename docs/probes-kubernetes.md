# Healthcheck Kubernetes

## Vue d'ensemble

Ce document décrit l'implémentation des vérifications de santé (healthcheck) Kubernetes pour l'application Sirena. Les endpoints de healthcheck permettent à Kubernetes de surveiller l'état de santé de l'application et de prendre des décisions automatiques concernant le déploiement et le routage du trafic.

## Architecture

Les endpoints de healthcheck sont exposés sur un port dédié (`4001` par défaut, soit port principal + 1) séparé du port principal de l'application (`4000`). Cette séparation permet :

- D'isoler les vérifications de santé du trafic applicatif
- De sécuriser les endpoints de monitoring
- D'éviter les interférences avec les middlewares d'authentification

## Activation/Désactivation

Le serveur de healthcheck peut être activé ou désactivé via la variable d'environnement `HEALTHCHECK=enabled`. **Par défaut, le serveur est désactivé** pour éviter d'exposer des endpoints non nécessaires en développement.

## Endpoints disponibles

### 1. Endpoint racine (`/`)

**Rôle :** Fournit des métriques détaillées de l'état de santé de l'application.

**Utilisation :** Endpoint généraliste pour obtenir les métriques actuelles de tous les composants de l'application. **Retourne toujours un code 200** avec des informations détaillées.

**Métriques fournies :**
- 📊 **Base de données** : statut (connected/disconnected) + temps de réponse en ms + métriques de connexions (active/idle/total)
- 📊 **Serveur HTTP** : statut (listening) + temps de fonctionnement (uptime)
- 📊 **Event loop** : statut (healthy/overloaded) + latence en ms
- ⚙️ **Seuils configurables** : seuils de latence event loop et maximum de connexions DB

**Format de réponse :**
```json
{
  "status": "ok",
  "metrics": {
    "database": {
      "status": "connected",
      "responseTime": 5.2,
      "connections": {
        "active": 2,
        "idle": 1,
        "total": 3
      }
    },
    "http": {
      "status": "listening",
      "uptime": 123.45
    },
    "eventLoop": {
      "status": "healthy",
      "lag": 0.5
    }
  },
  "thresholds": {
    "eventLoopLag": 500,
    "maxConnections": 1000
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 2. Startup Probe (`/alive`)

**Rôle :** Vérifie que l'application a terminé son démarrage et est prête à recevoir des requêtes.

**Utilisation :** Kubernetes utilise cette sonde pour déterminer si le conteneur a démarré avec succès. Si la sonde échoue, Kubernetes redémarre le conteneur.

**Vérifications effectuées :**
- ✅ Serveur HTTP fonctionnel

**Note :** La connectivité à la base de données n'est pas vérifiée dans cette sonde car Prisma gère automatiquement les reconnexions. Une déconnexion temporaire ne devrait pas provoquer un redémarrage du conteneur.

**Configuration :**
- Délai initial : 10 secondes
- Période : 5 secondes
- Timeout : 3 secondes
- Seuil d'échec : 6 tentatives

### 2. Liveness Probe (`/alive`)

**Rôle :** Vérifie que l'application est toujours en vie et fonctionne correctement.

**Utilisation :** Kubernetes utilise cette sonde pour détecter si l'application est dans un état défaillant. Si la sonde échoue de manière répétée, Kubernetes redémarre le conteneur.

**Vérifications effectuées :**
- ✅ Serveur HTTP fonctionnel

**Note :** La connectivité à la base de données n'est pas vérifiée dans cette sonde car Prisma gère automatiquement les reconnexions. Une déconnexion temporaire ne devrait pas provoquer un redémarrage du conteneur.

**Configuration :**
- Délai initial : 30 secondes
- Période : 10 secondes
- Timeout : 5 secondes
- Seuil d'échec : 3 tentatives

### 3. Readiness Probe (`/ready`)

**Rôle :** Vérifie que l'application est prête à recevoir du trafic.

**Utilisation :** Kubernetes utilise cette sonde pour déterminer si le pod doit recevoir du trafic via les services. Si la sonde échoue, le pod est retiré du pool de load balancing sans être redémarré.

**Vérifications effectuées :**
- ✅ Connectivité à la base de données
- ✅ Serveur HTTP fonctionnel
- ✅ Event loop Node.js non saturé (latence < 500ms)

**Configuration :**
- Délai initial : 5 secondes
- Période : 5 secondes
- Timeout : 3 secondes
- Seuil d'échec : 3 tentatives

## Réponses des endpoints

### Format de réponse

Tous les endpoints retournent une réponse JSON avec le format suivant :

```json
{
  "status": "ok|error",
  "checks": {
    "database": true|false,
    "http": true|false,
    "eventLoop": true|false
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Codes de statut HTTP

- **200 OK** : Toutes les vérifications ont réussi
- **503 Service Unavailable** : Une ou plusieurs vérifications ont échoué

## Monitoring et observabilité

Les endpoints fournissent des informations détaillées sur l'état de chaque composant :

### Métriques du endpoint racine (`/`)
- **database.status** : `connected` ou `disconnected`
- **database.responseTime** : Temps de réponse en millisecondes
- **database.connections.active** : Nombre de connexions actives
- **database.connections.idle** : Nombre de connexions inactives
- **database.connections.total** : Nombre total de connexions
- **http.status** : `listening` (toujours présent)
- **http.uptime** : Temps de fonctionnement en secondes
- **eventLoop.status** : `healthy` ou `overloaded`
- **eventLoop.lag** : Latence de l'event loop en millisecondes
- **thresholds.eventLoopLag** : Seuil configuré pour la latence event loop (ms) - défaut 500ms
- **thresholds.maxConnections** : Seuil configuré pour le maximum de connexions DB

### Vérifications des endpoints `/alive` et `/ready`
- **http** : Indique si le serveur HTTP répond aux requêtes (boolean) - présent dans `/alive` et `/ready`
- **database** : Indique si la connexion à PostgreSQL est opérationnelle (boolean) - **uniquement pour `/ready`**
- **eventLoop** : Indique si l'event loop Node.js n'est pas saturé (boolean) - uniquement pour `/ready`

## Variables d'environnement

| Variable | Défaut | Description |
|----------|---------|-------------|
| `HEALTHCHECK` | `disabled` | Active le serveur quand défini à `enabled` |
| `HEALTHCHECK_PORT` | `4001` | Port d'écoute du serveur de healthcheck (port serveur + 1) |
| `HEALTHCHECK_EVENT_LOOP_THRESHOLD` | `500` | Seuil de latence event loop en ms (healthy si < seuil) |
| `HEALTHCHECK_MAX_CONNECTIONS_THRESHOLD` | `1000` | Seuil d'alerte pour le nombre maximum de connexions DB |

## Utilisation en développement

Pour tester les endpoints en local :

```bash
# Démarrer l'application avec healthcheck activé et seuils personnalisés
HEALTHCHECK=enabled HEALTHCHECK_EVENT_LOOP_THRESHOLD=50 HEALTHCHECK_MAX_CONNECTIONS_THRESHOLD=500 npm run dev

# Tester les métriques générales (toujours 200)
curl http://localhost:4001/

# Tester la sonde alive
curl http://localhost:4001/alive

# Tester la sonde ready
curl http://localhost:4001/ready
```
