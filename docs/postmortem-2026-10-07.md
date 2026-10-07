# Post-mortem - Incident de production du 07/10/2026

## Objet

Indisponibilité intermittente de l'application en production, de 14h44 à 15h21 (CEST), soit
environ 37 minutes. Déclencheur externe : un incident sur le stockage objet S3 d'OVHcloud
([incident `kdqq2smzfd4t`](https://public-cloud.status-ovhcloud.com/incidents/kdqq2smzfd4t)).

Cette panne d'une dépendance qui ne concerne qu'une seule fonctionnalité (l'upload de pièces
jointes) a provoqué **15 redémarrages des pods backend** et rendu **l'ensemble** de
l'application inaccessible par intermittence.

## Impact

- **Utilisateurs** : application inaccessible par intermittence pendant ~37 min, sur tous les
  parcours. 502 lorsque les deux pods backend étaient indisponibles simultanément, 503
  lorsqu'un pod était tombé et que le second ne répondait plus aux probes.
- **Fonctionnel** : échec de tous les uploads de pièces jointes (`POST /uploaded-files`) sur la
  fenêtre ; requêtes en cours interrompues à chaque redémarrage de pod.
- **Données** : aucune perte constatée. Le rollback S3/DB de `uploadFileToMinio` limite le
  risque d'objets orphelins. Reste à vérifier : les uploads multipart incomplets dans le
  bucket et les fichiers restés dans un statut de traitement non terminal.
- **Communication** : aucune information diffusée aux utilisateurs pendant l'incident.

## Cause principale

Le déclencheur est externe, mais la cause de l'indisponibilité **globale** est interne : les
pods backend ne sont pas tombés sous l'effet d'un kill de Kubernetes, **ils se sont arrêtés
d'eux-mêmes** (`exitCode: 1`, voir point 2). Le chemin d'upload vers S3 n'est pas isolé du
reste du service. Il n'y a ni limite de
concurrence, ni circuit breaker, ni timeout sur les appels sortants, ni filet de sécurité au
niveau du processus Node. Une panne de dépendance non critique dégrade donc tout le service
au lieu de dégrader la seule fonctionnalité concernée.

## Chronologie (CEST)

| Heure | Évènement |
|---|---|
| 14h44 | Premier redémarrage de pod backend (constaté a posteriori) |
| 14h49 | **Première alerte Sentry** : erreurs 503 |
| 14h56 | Alerte Sentry : erreurs 502 |
| 14h59 | Alerte donnée manuellement sur Mattermost, canal `TEAM-SIRENA` |
| 15h00 | **Alerte automatique updown.io** : service down (confirmation externe) |
| 15h02 | Vague d'alertes Sentry supplémentaires |
| ~15h05 | Analyse : 5 redémarrages de pods constatés (cluster + logs Grafana). Pas de pic CPU ni RAM. Les probes échouent. Hypothèse d'un problème de connexion à un service tiers |
| 15h07 | Escalade sur `Product_SIRENA/dev` avec mention directe des DevOps et lien Grafana, le canal `TEAM-SIRENA` étant trop restreint. Visio ouverte avec Kévin dans la foulée |
| ~15h08 | Logs : `Request failed after 1 retries: Retryable HTTP status: 500` sur `minio`, soupçon restreint à la connexion S3 |
| 15h10 | Kévin signale qu'un autre projet remonte des problèmes sur le S3 d'OVH et pointe l'incident OVH `kdqq2smzfd4t`. **Déclencheur confirmé** |
| ~15h15 | Décision : pas de correctif à chaud. On attend la résolution côté OVH et on planifie un correctif de résilience |
| 15h21 | Dernier redémarrage de pod, 15 au total depuis 14h44 |
| 15h40 | Fin de la visio après confirmation de la stabilisation des conteneurs |

Délais : détection 5 min · escalade efficace 18 min · identification du déclencheur 26 min ·
stabilisation 37 min.

## Trace à l'origine du diagnostic

```json
{"level":50,"req":{"method":"POST","url":"/uploaded-files"},
 "err":{"type":"Error","message":"Request failed after 1 retries: Error: Retryable HTTP status: 500",
 "stack":"... at requestWithRetry (minio/dist/esm/internal/request.mjs:61:17)
   at async Client.getBucketRegionAsync (minio/dist/esm/internal/client.mjs:568:19)
   at async Client.listIncompleteUploadsQuery (minio/dist/esm/internal/client.mjs:1089:17)
   at async Client.findUploadId (minio/dist/esm/internal/client.mjs:1155:22)
   at async Client.uploadStream (minio/dist/esm/internal/client.mjs:1445:30)
   at async uploadFileToMinio (apps/backend/dist/libs/minio.js:63:9)
   at async apps/backend/dist/features/uploadedFiles/uploadedFiles.controller.js:42:74"},
 "msg":"Internal server error"}
```

## Analyse technique

### 1. Aucun filet de sécurité au niveau du processus

Ni `apps/backend/src/index.ts` ni `apps/backend/src/start-worker.ts` n'installent de handler
`uncaughtException` ou `unhandledRejection`. Toute erreur de flux ou tout rejet de promesse non
intercepté tue le processus Node, donc redémarre le conteneur, sans trace exploitable et sans
pic CPU ni RAM.

Un chemin concret existe dans `apps/backend/src/libs/minio.ts` : dans le bloc `catch` de
`uploadFileToMinio`, `sourceStream.destroy(err)` déclenche `encryptStream.destroy(err)` alors
que `minio` a potentiellement déjà détaché ses écouteurs, ce qui produit un évènement `error`
sans auditeur.

**Leçon** : un service exposé doit toujours installer des handlers globaux qui loguent et
remontent à Sentry avant de laisser le processus s'arrêter. Sans eux, un crash est
indiscernable d'un kill par Kubernetes.

### 2. Le mécanisme est une sortie du processus, pas un thread bloqué

L'hypothèse formulée pendant l'incident — l'upload S3 étant synchrone, il bloque le thread et
les probes ne répondent plus — a correctement désigné le chemin de code fautif, mais pas le
mécanisme :

- Node ne bloque pas sa boucle d'événements sur de l'I/O réseau. Un appel S3 lent ou en échec
  laisse une promesse en attente, il ne gèle pas le thread.
- La **liveness probe cible `/version`** (`helm_charts/charts/backend/values.yaml`), route
  purement CPU sans aucune I/O (`features/version/version.controller.ts`). La **readiness cible
  `/health`**, qui ne fait qu'un `SELECT 1` Prisma (`features/health/health.service.ts`).
  **Aucune des deux probes ne dépend de S3.** Une lenteur S3 ne peut donc pas, à elle seule,
  les faire échouer.
- Pour que `/version` cesse de répondre, il faut que le processus ait disparu, ou que le serveur
  HTTP ne puisse plus accepter de connexion.

La raison de terminaison des conteneurs, relevée après l'incident, confirme que le processus
est sorti de lui-même :

```sh
kubectl get pod <pod> -o jsonpath='{.status.containerStatuses[*].lastState.terminated}'
```

```json
// backend-f4c9f79dc-4wlrr
{"exitCode":1,"reason":"Error","startedAt":"2026-10-07T13:10:31Z","finishedAt":"2026-10-07T13:13:56Z"}
// backend-f4c9f79dc-j29hb
{"exitCode":1,"reason":"Error","startedAt":"2026-10-07T13:10:21Z","finishedAt":"2026-10-07T13:12:14Z"}
```

Soit, en heure locale, deux conteneurs démarrés à 15h10 et morts après 3 min 25 s et 1 min 53 s
de vie. Trois conclusions :

- **Ce n'est pas un kill par Kubernetes.** Un kill sur échec de liveness passe par un SIGTERM,
  auquel `gracefulShutdown` (`apps/backend/src/index.ts`) répond par `process.exit(0)`, ce qui
  donnerait `exitCode: 0` et `reason: Completed`. Un `exitCode: 1` signifie que le processus a
  décidé de s'arrêter.
- **Ce n'est pas un OOMKill** : il serait rapporté `reason: OOMKilled` avec `exitCode: 137`,
  ce qui est cohérent avec l'absence de pic mémoire observée pendant l'incident.
- **Les deux pods ont démarré à 10 secondes d'écart**, donc étaient indisponibles
  simultanément juste avant : c'est la signature des 502 côté client.

Deux chemins mènent à ce code 1, et ils restent à départager dans les logs :

1. **Exception ou rejet non intercepté** : c'est le code de sortie par défaut de Node, et le
   point 1 décrit un chemin concret pour y arriver depuis `uploadFileToMinio`.
2. **Échec pendant l'arrêt propre** : sur SIGTERM, le bloc `catch` de `gracefulShutdown` fait
   `process.exit(1)`. Pendant une panne réseau, la fermeture de Redis (`connection.quit()`) ou
   de Prisma peut échouer et transformer un arrêt propre en sortie en erreur.

Le départage se fait sur la présence ou l'absence des lignes « Graceful shutdown initiated » et
« Error during graceful shutdown » juste avant la fin du conteneur
(`kubectl logs <pod> --previous`, ou Grafana sur la fenêtre 13:13:50-13:13:57 UTC).

Dans les deux cas le correctif immédiat est le même — les handlers globaux du point 1 — car
aujourd'hui aucun des deux chemins ne laisse de trace exploitable. Si c'est le chemin 2, il faut
en plus rendre `gracefulShutdown` tolérant aux erreurs de fermeture : pendant un incident
réseau, ne pas pouvoir dire au revoir à Redis ne doit pas faire sortir le processus en erreur.

**Leçon** : avant de conclure sur un mécanisme, vérifier ce que les probes interrogent
réellement, et relever la raison de terminaison du conteneur. Ici, la cible de chaque probe
invalidait l'hypothèse en quelques secondes, et `lastState.terminated` donnait la réponse.

### 3. Le chemin d'upload multiplie les appels S3

`features/uploadedFiles/uploadedFiles.controller.ts` appelle
`uploadFileToMinio(stream, fileName, contentType)` **sans la taille du fichier**. `minio`
bascule alors sur le chemin multipart `uploadStream` → `findUploadId` →
`listIncompleteUploadsQuery` → `getBucketRegionAsync`, soit **quatre appels S3 ou plus pour un
seul upload**, chacun étant un point de défaillance supplémentaire pendant l'incident. C'est
exactement la pile observée dans les logs.

Corollaire, indépendant de cet incident : sans taille connue, `minio` dimensionne ses parts
multipart sur la taille d'objet maximale et bufferise en mémoire des blocs très supérieurs au
fichier réel. Avec `MAX_FILE_SIZE = 200 Mo` (`config/files.constant.ts`) et une limite
conteneur à 1500 Mi, le risque d'OOMKill est réel.

**Leçon** : passer la taille à `putObject` quand elle est connue, ou borner explicitement
`partSize`. Un paramètre optionnel omis a ici quadruplé l'exposition à la panne.

### 4. Les appels sortants vers S3 ne sont pas bornés

Le `POST /uploaded-files` tient le flux client ouvert jusqu'à la fin ou l'échec du transfert
vers S3. Il n'y a ni limite de concurrence, ni circuit breaker, ni timeout de bout en bout :
pendant la panne, les appels condamnés ont continué à s'empiler.

Déférer cette écriture dans une file a été envisagé puis écarté : les octets n'existent nulle
part ailleurs que dans le flux HTTP du client — il n'y a aucun tampon côté serveur, par
conception (`extractUploadedFileMiddleware` streame sans bufferiser) — et le worker est un
deployment distinct, sans volume partagé avec le backend. Un staging durable serait nécessaire,
pour un gain que le bornage des appels (timeout, concurrence, circuit breaker) apporte déjà :
l'upload échoue proprement au lieu de mettre le service à terre. **L'upload reste donc dans le
cycle de requête HTTP.**

À noter en revanche : **la partie déjà découplée a échoué elle aussi.** La file `file-processing`
(`jobs/queues/fileProcessing.queue.ts`) est configurée avec `attempts: 3` et un backoff
exponentiel de 5 s, soit un budget de reprise d'environ 15 secondes. Face à une panne de
37 minutes, tout job de traitement engagé a épuisé ses tentatives et laissé le fichier en
statut `FAILED`, sans reprise automatique à la fin de l'incident.

**Leçon** : une dépendance externe doit être isolée derrière un timeout, une limite de
concurrence et un circuit breaker. Un appel sortant non borné transforme une panne
fournisseur en panne de service.

### 5. Chaque redémarrage de pod coûte plusieurs dizaines de secondes

L'init container `migration` (`helm_charts/charts/backend/values.yaml`) rejoue
`prisma migrate deploy` à **chaque** démarrage de pod, suivi de
`readinessProbe.initialDelaySeconds: 10`. C'est ce qui a transformé 15 redémarrages en
indisponibilité continue plutôt qu'en micro-coupures, et ce qui explique les 502 quand les
fenêtres d'indisponibilité des deux pods se chevauchaient.

**Leçon** : le redémarrage d'un pod doit être rapide. Les migrations de schéma relèvent d'un
Job de pré-déploiement, pas du chemin de démarrage de chaque pod.

### 6. Aucune alerte sur l'infrastructure elle-même

Les cinq premiers redémarrages, entre 14h44 et 14h49, n'ont déclenché aucune alerte.
L'incident a été détecté par ses symptômes utilisateurs (Sentry, puis updown.io), pas par sa
cause. Il n'existe pas non plus d'alerte sur le taux d'erreur des dépendances sortantes : le
lien avec S3 a été établi en lisant les logs à la main.

C'est la reconduction du point 9 du [post-mortem du 15/04/2026](./postmortem-2026-04-15.md),
dont l'action « mettre en place une alerte sur les CrashLoopBackOff » n'a pas été réalisée.

**Leçon** : une alerte sur les redémarrages de pods aurait avancé la détection de 5 minutes et,
surtout, aurait pointé directement la cause plutôt que le symptôme.

### 7. Pas de veille sur les status pages fournisseurs

26 minutes ont été nécessaires pour relier l'incident à OVH, et c'est le recoupement avec un
autre projet qui l'a permis, pas un outil.

**Leçon** : surveiller les status pages des fournisseurs critiques (OVH S3 en premier lieu) et
disposer d'une sonde synthétique d'écriture/lecture S3 pour distinguer en quelques secondes une
panne fournisseur d'un bug Sirena.

## Ce qui a bien fonctionné

- Détection automatique rapide et redondante : Sentry à 14h49, updown.io à 15h00.
- Escalade pertinente : le passage d'un canal restreint (`TEAM-SIRENA`) à `Product_SIRENA/dev`,
  avec mention directe des DevOps et lien Grafana, a mis l'équipe en relation en moins de
  5 minutes.
- La mutualisation inter-projets a permis d'identifier le déclencheur.
- Décision de ne pas corriger à chaud sous pression, avec un correctif planifié.

## Actions à mener

Correctifs immédiats (hotfix `v1.20.1`) :

- [ ] Installer des handlers `uncaughtException` et `unhandledRejection` sur le backend et le
      worker : log, remontée Sentry, puis arrêt propre
- [ ] Corriger la double destruction de flux dans `uploadFileToMinio` (`stream.pipeline`)
- [ ] Borner les appels S3 : agent HTTP avec `maxSockets` et `timeout`, plus un garde-fou
      applicatif de durée par opération
- [ ] Renvoyer un 503 explicite avec un message utilisateur quand le stockage est indisponible,
      au lieu d'un 500 générique, et permettre à l'utilisateur de relancer son envoi depuis
      l'interface
- [x] Déterminer la raison de terminaison des conteneurs : `exitCode: 1`, `reason: Error`,
      donc sortie du processus et non kill par Kubernetes (point 2)
- [ ] Départager les deux chemins de sortie en code 1 dans les logs du conteneur précédent :
      exception non interceptée, ou échec pendant `gracefulShutdown` (point 2)
- [ ] Rendre `gracefulShutdown` tolérant aux erreurs de fermeture de Redis et Prisma, pour
      qu'un arrêt propre pendant un incident réseau ne se termine pas en `exit(1)`

Correctifs pérennes :

- [ ] Aligner le budget de reprise de la file `file-processing` sur la durée d'une panne
      fournisseur réaliste (actuellement ~15 s pour 3 tentatives), et distinguer les erreurs
      transitoires des erreurs définitives pour permettre une reprise automatique
- [ ] Rejouer les traitements de fichiers restés en `FAILED` sur la fenêtre de l'incident
- [ ] Ajouter un circuit breaker et une limite de concurrence sur les dépendances sortantes
      (S3, ClamAV, DematSocial), dans un module partagé
- [ ] Passer la taille à `putObject` ou borner `partSize`, pour supprimer le chemin
      `findUploadId` et le risque d'OOM
- [ ] Nettoyer périodiquement les uploads multipart incomplets du bucket

Observabilité et infrastructure :

- [ ] Alerter sur les redémarrages de pods et les CrashLoopBackOff (action non réalisée du
      post-mortem du 15/04/2026)
- [ ] Exposer et alerter sur la durée et le taux d'erreur des appels sortants, par dépendance
- [ ] Exposer la latence de boucle d'événements et le nombre de handles actifs
- [ ] Mettre en place une sonde synthétique d'écriture/lecture S3
- [ ] Sortir `prisma migrate deploy` du chemin de démarrage des pods (Job de pré-déploiement)
- [ ] Passer les réplicas backend à 3 et ajouter un PodDisruptionBudget

Process :

- [ ] Rédiger un runbook d'incident : ordre des vérifications (Sentry, Grafana, `kubectl`,
      status pages fournisseurs), commandes prêtes à copier, canal d'escalade
      (`Product_SIRENA/dev` avec mention DevOps) et modèle de communication utilisateurs
