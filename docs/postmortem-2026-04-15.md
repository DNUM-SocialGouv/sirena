# Post-mortem - Mise en production du 15/04/2026

## Objet

Mise en production compliquee, ayant necessite des correctifs continus de 8h a 21h30 environ.

## Cause principale

Empressement et gestion de derniere minute. Plusieurs sujets non stabilises ont ete pousses sans validation suffisante, entrainant une cascade de correctifs dans la journee.

## Chronologie des problemes

### 1. Assertion erronee sur DematSocial

Une hypothese incorrecte sur le comportement du logiciel tiers DematSocial a conduit a un correctif contreproductif. Le fix applique a aggrave la situation plutot que la resoudre.

**Lecon** : valider les hypotheses sur les systemes tiers avant d'appliquer un correctif, en particulier quand le comportement n'est pas documente.

### 2. Recette tardive et correctifs PDF a la hate

La recette sur la generation PDF a ete realisee trop tard dans le cycle. Les bugs decouverts ont du etre corriges dans l'urgence, sans le recul necessaire. On a même du finir par retirer le bouton de téléchargement, temporairement.

**Lecon** : la recette des fonctionnalites critiques (generation de documents) doit avoir lieu bien avant la MEP, pas la veille ou le jour meme.

### 3. Delta metier non verifie avec les PO

Une PR a integre un changement metier sans validation prealable avec les Product Owners, à la demande d'un reviewer. Le delta entre ce qui a ete implemente et ce qui etait attendu a genere des corrections supplementaires.

**Lecon** : tout changement metier dans une PR doit passer par les PO.

### 4. Divergence TLS entre clusters (sslmode)

La base de donnees en production est une DB managee, tandis que les environnements de dev utilisent CNPG. Le TLS n'est pas iso-prod : la DB managee presente un certificat signe par une CA interne (self-signed chain), ce qui provoquait une erreur `self-signed certificate in certificate chain` sur le health check Prisma.

**Correctif** : remplacement de `sslmode=require` par `sslmode=no-verify` dans la connection string via une variable d'environnement `PG_SSL_ALLOW_SELF_SIGNED`, activee uniquement sur formation, preproduction et production.

**Lecon** : les environnements de dev doivent etre aussi proches que possible de la prod, en particulier sur la configuration TLS des bases de donnees.

### 5. Tickets traites trop tard dans le workflow

Des sujets qui auraient du etre traites en amont (migrations de donnees, ajout du module support Atlassian) ont ete realises au dernier moment, ajoutant de la pression et du risque le jour de la MEP.

**Lecon** : les migrations de donnees et les integrations tierces doivent etre planifiees et livrees en avance, pas le jour de la mise en production. S'il manque des données, la MEP doit être décalée.

### 6. CSP absentes en local

Les Content-Security-Policy sont configurees au niveau Helm/ingress et ne sont pas reproduites en local. Les erreurs CSP (blocage du widget Atlassian, de Sentry cloud) n'ont ete decouvertes qu'en environnement deploye.

**Lecon** : envisager de reproduire les headers CSP en dev local (via un proxy ou une config du dev server) pour detecter ces problemes plus tot.

### 7. Identifiants d'entite differents entre environnements

Les identifiants des entites ne sont pas les memes entre les environnements, ce qui a cause des incoherences et des bugs specifiques a certains environnements.

**Lecon** : harmoniser les donnees de reference entre environnements, ou a defaut, les scripts et migrations doivent etre robustes face a des identifiants variables (recherche par label/code plutot que par UUID).

### 8. Regressions suite a la mise a niveau Prisma

La montee de version de Prisma a introduit des regressions non detectees avant la MEP.

**Lecon** : les montees de version de dependances critiques (ORM, framework) doivent etre testees en isolation et validees en staging avant une MEP.

### 9. Pas de rollback automatique en cas de bug runtime

Quand le backend crashe au runtime, le deploiement ne considere pas l'echec comme definitif. La probe de readiness retry en boucle sans jamais declencher de rollback automatique. Le pod reste en etat de crash loop sans revenir a la version precedente.

**Lecon** : configurer un `progressDeadlineSeconds` et une strategie de rollback sur le Deployment Kubernetes, et/ou mettre en place une alerte sur les CrashLoopBackOff qui persiste.

### 10. Scripts de rollback Prisma non migres

Les scripts CLI pour `prisma migrate resolve` n'avaient pas ete migres vers le package `@sirena/db`. Le rollback d'une migration echouee n'etait pas possible via les scripts du projet.

**Correctif** : ajout de `migrate:resolve` dans le package db et du raccourci `db:migrate:resolve` au niveau root.

**Lecon** : les outils de recovery (rollback, resolve) doivent etre testes et fonctionnels avant une MEP, pas decouverts pendant l'incident.

## Actions a mener

- [ ] Reproduire les CSP en environnement local
- [ ] Harmoniser les identifiants d'entite entre environnements ou rendre les migrations robustes aux differences
- [ ] Configurer un rollback automatique Kubernetes en cas de CrashLoopBackOff prolonge
- [ ] Planifier les migrations de donnees et integrations tierces au moins 2 jours avant la MEP
- [ ] Valider les montees de version de dependances critiques en staging avant MEP
