# Post-mortem - Incident de production du 23/10/2026

## Objet

Indisponibilité de `sirena-sante.social.gouv.fr` en production. Fenêtre totale de ~12h00 à
14h50 (CEST), dont **1h24 d'indisponibilité publique** mesurée par updown.io (12h07:59 →
13h32), puis ~45 min de service en capacité réduite. Déclencheur externe : le cluster
Kubernetes d'hébergement (Atlas v1, zone production) a perdu des nœuds de travail au cours
d'une rotation de nœuds menée par la plateforme.

Les nœuds ont été retirés sans que les remplacements n'arrivent en état d'accueillir des pods
pendant ~2 heures, et les nœuds restants n'avaient plus assez de **réservations de ressources**
disponibles pour replanifier les applications évacuées. Sirena production a été le service le
plus visible ; d'autres produits hébergés sur le même cluster ont perdu des réplicas, sans
coupure publique constatée pour eux.

## Impact

- **Utilisateurs** : `sirena-sante.social.gouv.fr` en 503 de 12h08 à 13h32, puis en capacité
  réduite (1 frontend sur 2, 1 backend sur 2, workers réduits) jusqu'à ~14h15.
- **Fonctionnel** : la base **MariaDB « sirec » de production** est restée indisponible jusqu'à
  ~14h50 ; toutes les fonctionnalités qui s'appuient sur elle ont renvoyé des erreurs pendant
  l'incident. **Metabase production** (`org-sdpsn-ws-sirena-services-production`) indisponible
  de ~12h00 à ~14h45.
- **Environnements hors production** : le worker de **validation** a cessé d'émettre dès ~12h22,
  touché par la même éviction. **Formation** et **préproduction** ont, elles, été
  volontairement arrêtées de ~13h25 à ~14h20 pour libérer les réservations nécessaires à la
  production (voir Contournement).
- **Données** : aucune perte. PostgreSQL géré (OVH), S3 et Valkey sont restés disponibles — ils
  ne sont pas hébergés par le pool de nœuds concerné — et les volumes sont persistants.
- **Communication** : aucune information diffusée aux utilisateurs pendant l'incident.

## Cause principale

Le déclencheur est externe, mais le mécanisme est une **pénurie de capacité planifiable**. À la
fin de l'incident, les évènements du scheduler donnent l'état exact : `0/7 nodes are available:
1 Insufficient memory, 3 node(s) had untolerated taint {node-role.kubernetes.io/control-plane},
4 Insufficient cpu`. Soit **4 nœuds de travail**, tous saturés en réservations CPU
(95-100 %), les 3 autres nœuds étant des control-planes qui n'accueillent pas de charge.

La replanification d'une application exige un nœud disposant des ressources **demandées**
(`requests`), bien supérieures à la consommation réelle — elle-même autour de 10 %. Toutes les
applications évincées se sont donc retrouvées en attente simultanément, sans priorité entre
elles ni marge de capacité pour en absorber une seule. Le scheduler le dit explicitement :
`preemption: 0/7 nodes are available: 4 No preemption victims found for incoming pod`.

## Chronologie (CEST)

| Heure | Évènement |
|---|---|
| ~12h00 | Éviction des pods des nœuds de travail en cours de rotation (dont `prod-main-mw4c8-mjfdw`) |
| 12h07:59 | Début de l'indisponibilité publique mesurée par updown.io (503) |
| 12h08 | **Première alerte automatique** : `updown.io` « ALERT: DOWN », `SIRENA - Production - Frontend`, 503 Service Unavailable (canal `alerts/sirena/uptime`) |
| ~12h09 | Premiers `FailedScheduling` : 13 nœuds, dont **6 `unschedulable`** et 4 saturés en CPU. L'information de cause est disponible à partir de cette minute |
| 12h09 | Retrait officiel d'un nœud du cluster |
| 12h19 | Grafana `DatasourceNoData` sur la règle « Cron job failed (production) » : plus aucun log du worker de production (canal `alerts/sirena/dev`) |
| 12h22 | Même alerte pour « Cron job failed (validation) » : le worker de validation est également absent |
| 12h36 | `updown.io` « STILL DOWN », 29 minutes |
| **12h55** | **Signalement humain** : Aurélie (PO) alerte sur Mattermost `Product_SIRENA`. C'est le point d'entrée réel de l'incident, 47 min après la première alerte automatique |
| 12h56 | Josquin qualifie : erreur 503. Gaël constate les pods en `Pending` |
| **12h57** | Gaël publie les évènements `FailedScheduling` : CPU insuffisant sur les nœuds. **Cause identifiée, 2 minutes après le signalement.** Hors périmètre applicatif |
| 13h00-13h25 | Confirmation : les 4 nœuds de travail restants sont à 95-100 % de leurs réservations CPU, toute replanification échoue, et la rotation apparaît interrompue |
| 13h03 | Josquin indique avoir lancé une investigation de son côté (sans détail partagé sur le canal) |
| 13h06 | `updown.io` « STILL DOWN », environ 1 heure |
| 13h13 | Lien de visio partagé par Josquin (sans contexte sur le canal) |
| ~13h25 | Un premier pod frontend réussit à se replanifier |
| 13h32 | **`updown.io` « RECOVERY »** : le site public répond de nouveau, en capacité réduite |
| 13h25-13h50 | Contournement : réduction temporaire de la charge sirena. Metabase production et l'antivirus de production reviennent |
| ~14h01 | Grafana `ContainerHighCpuUtilization` sur `metabase-6db4547f8d-94rwd` (194 %), résolue à 14h06 |
| ~14h05 | La plateforme reprovisionne le pool (**4 → 8 nœuds de travail**) ; replanification générale de tous les produits |
| 14h10-14h15 | Les alertes `DatasourceNoData` des workers production et validation se résolvent (`grafana_state_reason = MissingSeries`) |
| ~14h15 | Sirena production complet (tous les composants 2/2) ; formation et préproduction rétablies |
| ~14h29 | `ContainerHighCpuUtilization` sur un **nouveau** pod `metabase-6db4547f8d-hdk5p` (200 %), résolue à 14h34 |
| ~14h45 | Metabase production à nouveau fonctionnel |
| ~14h50 | Dernier composant replanifié (MariaDB sirec) ; retour à la normale complet |

Délais : détection automatique **8 min** · signalement humain **47 min après l'alerte** ·
identification de la cause **2 min après le signalement** · service public rétabli 1h24 ·
retour à la normale complet 2h50.

## Traces à l'origine du diagnostic

Évènements du scheduler sur un pod de production, relevés à 12h57. Les horodatages sont
relatifs : `48m` ramène à ~12h09, soit la minute du retrait de nœud. Premier et dernier
évènement de la série, qui encadrent la réduction du pool :

```text
Warning  FailedScheduling  48m (x7 over 49m)    default-scheduler
  0/13 nodes are available: 1 Insufficient memory,
  3 node(s) had untolerated taint {node-role.kubernetes.io/control-plane: },
  4 Insufficient cpu, 6 node(s) were unschedulable.
  preemption: 0/13 nodes are available: 4 No preemption victims found for incoming pod,
  9 Preemption is not helpful for scheduling.

Warning  FailedScheduling  5m11s (x8 over 36m)  default-scheduler
  0/7 nodes are available: 1 Insufficient memory,
  3 node(s) had untolerated taint {node-role.kubernetes.io/control-plane: },
  4 Insufficient cpu.
  preemption: 0/7 nodes are available: 3 Preemption is not helpful for scheduling,
  4 No preemption victims found for incoming pod.
```

Les évènements intermédiaires font décroître le total : `0/13`, `0/10`, `0/9`, `0/8` (à trois
reprises), puis `0/7`. Trois nœuds étant des control-planes, le pool de travail passe de **10
nœuds à 4**. Plusieurs évènements mentionnent aussi un nœud porteur du taint
`node.cilium.io/agent-not-ready`.

Supervision externe, canal `alerts/sirena/uptime` — seule alerte à avoir désigné le symptôme
réel, dès 12h08 :

```text
ALERT: DOWN 🔥   SIRENA - Production - Frontend
Down since 12:07:59 (CEST), reason: 503 Service Unavailable
→ STILL DOWN (29 minutes) à 12h36
→ STILL DOWN (about 1 hour) à 13h06
→ RECOVERY ✅ à 13h32
```

Grafana, canal `alerts/sirena/dev` — l'alerte annonce un cron en échec, alors qu'il n'y a plus
de worker pour émettre quoi que ce soit :

```text
[FIRING:1] DatasourceNoData Sirena (feqx8avvem5mob A Cron job failed (production))
  alertname = DatasourceNoData
  rulename  = Cron job failed (production)
  Value: [no value]
  summary = 🚨 Un cron job a échoué (en production)
→ [FIRING:2] à 12h22, « Cron job failed (validation) » s'ajoute
→ [RESOLVED] à 14h10 / 14h15, grafana_state_reason = MissingSeries
```

Grafana, canal `alerts/sirena` — les deux seules alertes concernant Metabase arrivent **après**
son retour, et portent sur deux pods successifs :

```text
[FIRING:1] ContainerHighCpuUtilization Sirena (metabase ... metabase-6db4547f8d-94rwd)
  Value: A=194.34389319326564, C=1        14h01 → RESOLVED 14h06 (A=40.29)
[FIRING:1] ContainerHighCpuUtilization Sirena (metabase ... metabase-6db4547f8d-hdk5p)
  Value: A=199.84517544055555, C=1        14h29 → RESOLVED 14h34 (A=59.44)
```

## Analyse technique

### 1. Le pool de travail est passé de 10 nœuds à 4, pas de 5 à 4

Le récit initial est celui d'un nœud unique retiré sans remplaçant. Les évènements du scheduler
décrivent une rotation bien plus large : dès ~12h09, **6 nœuds de travail sur 10 étaient déjà
`unschedulable`**, et les 4 restants étaient saturés. Le total a ensuite décru par paliers
(13 → 10 → 9 → 8 → 7 nœuds, control-planes compris) jusqu'à ne laisser que ces 4 nœuds de
travail.

Deux points restent à recouper avec la plateforme :

- **Combien de nœuds la rotation a-t-elle cordonnés simultanément ?** Six nœuds rendus
  non planifiables d'un coup sur un pool de dix, avec quatre nœuds déjà pleins, rend la pénurie
  mécanique — ce n'est plus un effet de bord d'un retrait isolé.
- **Les remplaçants rejoignaient-ils le cluster ?** Plusieurs évènements montrent un nœud
  porteur du taint `node.cilium.io/agent-not-ready` : un nœud présent mais qui ne peut pas
  encore accepter de pod. L'affirmation « aucun remplacement ne rejoint le cluster » est donc à
  préciser : il a pu y avoir des arrivées, inutilisables au moment où il aurait fallu
  replanifier.

**Leçon** : la version « un nœud retiré » sous-estime l'incident d'un facteur six. Les
évènements du scheduler sont la source de vérité sur l'état du pool, et ils sont consultables
en une commande.

### 2. Ce sont les réservations qui décident, pas la consommation

Les nœuds étaient à 95-100 % de `requests` CPU pour une consommation réelle autour de 10 %. Le
scheduler ne raisonne que sur les réservations : un cluster visiblement inoccupé pouvait donc
être totalement incapable d'accueillir un pod. Les tableaux de bord de consommation ne
montraient aucune saturation — l'écart entre les deux vues a été le point d'entrée du
diagnostic.

**Leçon** : la métrique à surveiller pour la capacité de replanification est le taux de
réservation par nœud, pas l'utilisation. Aujourd'hui aucune alerte ne la surveille.

### 3. Aucune priorité de scheduling : le scheduler le dit noir sur blanc

Toutes les applications évincées — production, validation, et les autres produits du cluster —
ont concouru à égalité pour les quelques créneaux libérés. Les évènements sont explicites :
`No preemption victims found for incoming pod` et `Preemption is not helpful for scheduling`.
Faute de classes de priorité, un pod de production n'a **rien** à préempter : il attend son
tour comme les autres. Le retour du premier frontend à ~13h25 relève du hasard
d'ordonnancement.

Une première tentative de classes de priorité a été posée puis **retirée le jour même** :
l'ordonnancement inter-applications n'est pas garanti sur ce cluster, et le sujet doit être
repris avec la plateforme.

**Leçon** : en pénurie, l'absence de priorité explicite équivaut à un tirage au sort. Les
workloads de production doivent gagner les replanifications par construction — et la preuve
qu'ils ne le font pas est lisible directement dans les évènements de scheduling.

### 4. L'alerte a sonné en 8 minutes, l'incident est entré par la PO 47 minutes plus tard

La détection automatique a fonctionné : `updown.io` a ouvert une indisponibilité à 12h07:59 et
alerté à 12h08. Un rappel « STILL DOWN » a suivi à 12h36. Personne n'a réagi. L'incident est
entré dans l'équipe à **12h55**, par un signalement d'Aurélie (PO) sur `Product_SIRENA`.

Ce n'est pas un défaut d'outillage mais un défaut de prise en charge : une alerte
d'indisponibilité de la production est restée sans traitement pendant 47 minutes, et un rappel
n'a pas changé l'issue. Le canal `alerts/sirena/uptime` n'est pas un canal d'astreinte, c'est
un journal.

Le post-mortem du 07/10/2026 relevait la situation inverse — une détection trop tardive — et
créditait updown.io de la confirmation externe. L'outil a ici fait mieux que son rôle.

**Leçon** : une alerte `DOWN` sur la production doit déclencher une escalade immédiate et
nommée. Ces 47 minutes représentent **plus de la moitié** des 1h24 d'indisponibilité publique,
et elles sont la seule partie de l'incident qui était entièrement sous notre contrôle.

### 5. Une fois regardé, le diagnostic a pris deux minutes

À 12h55 le signalement arrive ; à 12h56 le 503 est qualifié et les pods sont vus en `Pending` ;
à 12h57 les évènements `FailedScheduling` sont publiés et la cause est établie : CPU
insuffisant sur les nœuds, hors périmètre applicatif.

Or ces évènements se répétaient depuis ~12h09 (`48m (x7 over 49m)`). **L'information de cause
était disponible à la minute 9 et a attendu la minute 57 que quelqu'un la lise.** Le coût de
l'incident n'est pas un coût de diagnostic, c'est un coût de déclenchement.

**Leçon** : ce qui manque n'est pas un outil d'analyse mais un chemin automatique entre « le
site est down » et « voici l'état du scheduler ». Les deux existaient, rien ne les reliait.

### 6. Aucune alerte ne désignait la cause, et une l'a activement masquée

Trois alertes se sont déclenchées, aucune ne pointait la pénurie de capacité :

- `updown.io` a désigné le **symptôme** (503 sur le frontend public), ce qui est son rôle.
- Grafana `DatasourceNoData` a affiché « 🚨 Un cron job a échoué (en production) » alors
  qu'**aucun cron n'avait échoué** : la règle est une alerte d'absence de données sur les logs
  du worker, et c'est le worker lui-même qui avait disparu. Le libellé désigne une panne
  applicative pour un problème d'infrastructure. La résolution confirme la nature du signal :
  `grafana_state_reason = MissingSeries`.
- `ContainerHighCpuUtilization` sur Metabase n'a sonné qu'**après** le retour du service, sur
  deux pods successifs (`-94rwd` puis `-hdk5p`), à 194 % et 200 % de CPU : la signature d'un
  redémarrage, pas d'un incident.

Rien n'a alerté sur l'éviction, sur les nœuds rendus `unschedulable`, ni sur l'accumulation de
pods en `Pending`. C'est la reconduction du point 6 du
[post-mortem du 07/10/2026](./postmortem-2026-10-07.md), dont l'action « alerter sur les
redémarrages de pods et les CrashLoopBackOff » n'est pas réalisée.

**Leçon** : une alerte dont le libellé ne correspond pas à sa condition de déclenchement coûte
du temps de diagnostic au lieu d'en gagner. « Un cron a échoué » et « le worker n'émet plus »
sont deux incidents différents et doivent être deux alertes différentes.

### 7. Metabase et MariaDB sirec ne sont pas supervisés en disponibilité

Metabase production est resté indisponible ~2h45, MariaDB sirec ~2h50, et **aucune alerte ne
l'a signalé**. Les deux seules alertes les concernant sont des pics de CPU postérieurs à leur
retour. Leur indisponibilité n'a été établie qu'en les testant à la main pendant l'incident.

La supervision externe ne couvre que le frontend public. Tout ce qui est derrière — Metabase,
sirec, l'antivirus — n'a pas de sonde de disponibilité propre.

**Leçon** : chaque composant dont l'indisponibilité a un impact fonctionnel a besoin de sa
propre sonde. Sans elle, l'impact réel d'un incident n'est connu qu'après coup et dépend de ce
que quelqu'un a pensé à vérifier.

### 8. La seule marge de manœuvre a été de sacrifier le hors-production

Sans capacité à ajouter, sans priorité pour arbitrer et sans préemption possible, le seul
levier disponible côté produit était de **libérer des réservations en arrêtant ce qui n'est pas
la production**. C'est ce qui a été fait (voir Contournement), et c'est ce qui a ramené Metabase
et l'antivirus de production avant l'arrivée des nouveaux nœuds.

Ce levier est efficace mais il est manuel, non documenté au moment de l'incident, et il consomme
du temps de diagnostic. Il suppose aussi de savoir quels composants sont sacrifiables, ce qui
n'était écrit nulle part.

**Leçon** : la procédure de réduction de charge doit être écrite à l'avance, avec l'ordre de
sacrifice des environnements, pour être appliquée en minutes plutôt qu'improvisée.

### 9. La trace de la coordination est lacunaire

Entre 13h03 et 13h13, le canal porte une investigation « lancée » sans détail et un lien de
visio sans contexte. Le diagnostic était déjà convergé à 12h57, mais la reconstitution de ce
qui s'est décidé ensuite — notamment l'arbitrage sur l'arrêt de formation et préproduction — a
dû être refaite après l'incident.

**Leçon** : pendant un incident, le canal écrit est la seule mémoire. Une visio ne dispense pas
d'y consigner la décision et son motif, en une ligne.

## Contournement

Pour rendre la production au plus vite, la charge non productive a été temporairement réduite :
mise à l'arrêt des environnements **formation** et **préproduction** de sirena (et de leur
antivirus), libérant les réservations nécessaires aux composants de production. Tout a été
rétabli dès l'arrivée des nouveaux nœuds, entre ~14h15 et ~14h20.

Le détail opératoire est consigné dans le runbook sirena du dépôt d'infrastructure
(`30-migrations/sirena.md`).

## Ce qui a bien fonctionné

- **Le diagnostic, une fois lancé, a été immédiat** : 2 minutes entre le signalement de la PO
  et la cause établie, évènements du scheduler à l'appui, avec la bonne conclusion du premier
  coup (hors périmètre applicatif).
- **L'escalade est passée par le bon canal** : `Product_SIRENA`, celui que le post-mortem du
  07/10/2026 avait désigné comme efficace, et non un canal restreint.
- **La supervision externe a fait son travail** : indisponibilité ouverte à 12h07:59, alerte à
  12h08, rappels à 12h36 et 13h06, recovery à 13h32. La fenêtre publique est datée à la seconde
  sans reconstitution a posteriori.
- **Aucune perte de données.** Les dépendances d'état — PostgreSQL géré OVH, S3, Valkey — sont
  hors du pool de nœuds concerné, et les volumes sont persistants. L'incident n'a touché que la
  disponibilité.
- **Le contournement a fonctionné**, et a ramené une partie de la production (Metabase,
  antivirus) avant même le reprovisionnement du pool.
- **Le cloisonnement a tenu** : sacrifier formation et préproduction n'a eu aucune conséquence
  sur la production, et leur rétablissement a été immédiat.

## Actions à mener

Prise en charge des alertes — priorité la plus haute : 47 des 84 minutes d'indisponibilité
publique se sont écoulées avant que quiconque regarde :

- [ ] Définir une règle d'escalade pour une alerte `updown.io` « DOWN » en production : qui est
      prévenu, par quel canal, et sous quel délai. Le canal `alerts/sirena/uptime` est un
      journal, pas une astreinte
- [ ] Router les alertes de production vers une notification intrusive (mention directe,
      notification mobile), distincte du flux d'alertes des autres environnements
- [ ] Attacher à l'alerte `DOWN` les commandes de première intervention (`kubectl get pods`,
      `kubectl describe pod` pour les `FailedScheduling`) : l'information de cause était
      disponible dès la minute 9

Plateforme (à porter avec l'équipe d'hébergement) :

- [ ] Établir combien de nœuds la rotation a rendus `unschedulable` simultanément : les
      évènements du scheduler en montrent **6 sur 10** dès ~12h09, là où le récit initial parle
      d'un seul nœud retiré
- [ ] Vérifier le rôle du taint `node.cilium.io/agent-not-ready` : des nœuds ont pu rejoindre le
      cluster sans pouvoir accepter de pod, ce qui change la lecture de « aucun remplacement ne
      rejoint le cluster »
- [ ] Comprendre pourquoi la rotation s'est interrompue, et garantir qu'un nœud ne soit cordonné
      ou retiré qu'après qu'un remplaçant soit `Ready` **et** planifiable
- [ ] Borner le nombre de nœuds rendus non planifiables en même temps, au regard des
      réservations déjà engagées sur les nœuds restants
- [ ] Reprendre le sujet des classes de priorité avec la plateforme : l'ordonnancement
      inter-applications n'étant pas garanti sur ce cluster, la première tentative a été
      retirée le jour même

Capacité et observabilité :

- [ ] Alerter quand les réservations (`requests`) d'un nœud dépassent ~85 % — cette marge est
      inexistante aujourd'hui, et aucune alerte ne la surveille
- [ ] Alerter sur les pods en `Pending` non planifiables au-delà de quelques minutes, et
      remonter le motif `FailedScheduling` dans l'alerte (action voisine de celle, non
      réalisée, du post-mortem du 07/10/2026 sur les redémarrages de pods)
- [ ] Scinder la règle « Cron job failed » : une alerte pour un cron réellement en échec, une
      autre pour l'absence de données du worker. Aujourd'hui `DatasourceNoData` s'annonce comme
      une panne applicative et désigne le mauvais problème
- [ ] Ajouter des sondes de disponibilité sur Metabase production et MariaDB sirec : leurs
      ~2h45 et ~2h50 d'indisponibilité n'ont déclenché aucune alerte
- [ ] Doter les workloads de production de classes de priorité, pour qu'ils gagnent les
      replanifications en cas de pénurie et qu'une préemption soit possible
- [ ] Reprendre l'action ouverte du post-mortem du 07/10/2026 sur les réplicas backend et le
      PodDisruptionBudget : un PDB aurait contraint le rythme de l'éviction, ce qui reste à
      valider avec la plateforme sur ce cluster

Process :

- [ ] Procédure de réduction de charge en incident : documentée dans le runbook sirena, à
      maintenir et à rattacher au runbook d'incident réclamé par le post-mortem du 07/10/2026
- [ ] Définir et écrire l'ordre de sacrifice des environnements hors production, pour que le
      contournement soit applicable sans arbitrage à chaud
- [ ] Consigner les décisions d'incident sur le canal écrit, même quand l'échange a lieu en
      visio : l'arbitrage sur l'arrêt de formation et préproduction a dû être reconstitué
- [ ] Prévoir une communication utilisateurs : aucune information n'a été diffusée pendant les
      1h24 d'indisponibilité publique
