# Rapport de sécurité — Compromission supply-chain TanStack (CVE-2026-45321)

**Date du rapport** : 2026-05-12  
**Auteur** : Gaël, assisté par Claude Opus  
**Statut Sirena** : 🟢 Non impacté. 🚨 Action requise côté machines des devs (recherche de compromission)

---

## 1. Résumé exécutif

Entre le **11 et le 12 mai 2026**, un attaquant a publié **84 versions malveillantes réparties sur 42 paquets `@tanstack/*`** sur npm, suite à la compromission du pipeline CI de TanStack (Pwn Request + cache poisoning + extraction de token OIDC). Le malware embarqué (`router_init.js`, 2.3 MB obfusqué sur 3 couches) :

- Exfiltre les credentials (AWS, GCP, Vault, K8s, SSH, npm, GitHub, **Claude Code**)
- Se propage en re-publiant des paquets sous les comptes npm compromis (déjà observé : `@mistralai/mistralai`, `@uipath/*`, etc.)
- Installe des mécanismes de persistance dans `.claude/` et `.vscode/`
- Embarque un **dead-man's switch** qui exécute `rm -rf ~/` si le token GitHub est révoqué

**Severity** : Critique (CVSS 9.6) — toute machine ayant installé un paquet impacté est à considérer comme **compromise intégrale**.

**Statut Sirena** : 🟢 **Non impacté**. Dernier `pnpm install` (`91185ba1`) le 2026-05-11 à 09:17 UTC, soit ~10h avant la publication des paquets malveillants (19:15 UTC). Toutes les versions du lockfile sont strictement antérieures aux plages vulnérables. Aucun IoC trouvé dans le repo.

⚠️ **Mais** : chaque dev doit auditer **sa machine personnelle**, car le malware cible activement les fichiers Claude Code et peut être présent via d'autres projets, des installations globales, ou des paquets propagés par le ver.

---

## 2. Détails techniques de l'attaque

### Timeline (UTC)

| Date / heure | Événement |
|---|---|
| 2026-05-10 | Création du fork malveillant et ouverture de PR |
| 2026-05-11 10:49 | PR #7378 déclenche le workflow vulnérable (`pull_request_target`) |
| 2026-05-11 11:29 | Cache pnpm (1.1 GB) du repo TanStack empoisonné |
| 2026-05-11 19:15-19:26 | Workflow de release publie 84 artefacts compromis sur npm |
| 2026-05-12 | Découverte et publication de l'advisory GHSA-g7cv-rxg3-hmpx |

### Versions affectées (extraits, liste complète : GHSA-g7cv-rxg3-hmpx)

| Paquet | Plage compromise |
|---|---|
| `@tanstack/history` | 1.161.9–1.161.12 |
| `@tanstack/react-router` | 1.169.5–1.169.8 |
| `@tanstack/router-core` | 1.169.5–1.169.8 |
| `@tanstack/router-plugin` | 1.167.38–1.167.41 |
| `@tanstack/router-devtools-core` | 1.167.6–1.167.9 |
| `@tanstack/router-generator` | 1.166.45–1.166.48 |
| `@tanstack/router-utils` | 1.161.11–1.161.14 |
| `@tanstack/virtual-file-routes` | 1.161.10–1.161.13 |
| `@tanstack/react-router-devtools` | 1.166.16–1.166.19 |
| `@tanstack/react-start` (+ client/server) | 1.167.68–1.167.71 |
| `@tanstack/eslint-plugin-router` | 1.161.9–1.161.12 |
| `@tanstack/vue-router`, `@tanstack/solid-router` | 1.169.5–1.169.8 |
| (+ ~30 autres `@tanstack/*`) | voir GHSA |

### Victimes secondaires (worm-propagated)

- `@mistralai/mistralai` 2.2.2–2.2.4
- ~40 paquets de l'espace `@uipath/`
- `draftlab`, `Squawk` (données aviation)
- 100+ autres paquets non-TanStack

---

## 3. Indicateurs de compromission (IoCs)

### Fichiers / strings à grep

| Indicateur | Type |
|---|---|
| `router_init.js` (SHA-256 `ab4fcadaec49c03278063dd269ea5eef82d24f2124a8e15d7b90f2fa8601266c`) | Payload principal |
| `"@tanstack/setup": "github:tanstack/router#79ac49eedf774dd4b0cfa308722bc463cfe5885c"` | Marqueur dans `optionalDependencies` |
| `OhNoWhatsGoingOnWithGitHub` | String campagne (recherche dans commits) |
| `IfYouRevokeThisTokenItWillWipeTheComputerOfTheOwner` | String dead-man's switch |
| `svksjrhjkcejg` | Salt PBKDF2 unique au malware |
| `claude@users.noreply.github.com` | Auteur des commits de dead-drop |
| `dependabout/…/setup-formatter` | Pattern de branches de dead-drop |

### Domaines / URLs C2 à bloquer

- `*.getsession.org` (canal P2P primaire, **bloquer au DNS**, le blocage IP est inefficace)
- `api.masscan.cloud`
- `git-tanstack.com`
- `litter.catbox.moe/h8nc9u.js`
- `litter.catbox.moe/7rrc6l.mjs`

### Persistance

- `~/.claude/router_runtime.js`
- Modifications de `~/.claude/settings.json` (ajout de hooks)
- `.vscode/setup.mjs` dans des workspaces
- Modifications de `.vscode/tasks.json`
- Fichiers `.claude/setup.mjs`

---

## 4. Vérifications à faire sur ta machine

> ⚠️ **AVANT de révoquer quoi que ce soit**, fais d'abord toutes les vérifications. Si tu trouves un signe de compromission, **désactive d'abord la persistance** (étape 5) **avant** de toucher à tes tokens — sinon le dead-man's switch peut déclencher `rm -rf ~/`.

### 4.1. Audit npm

```bash
# Versions de @tanstack/* installées globalement
npm ls -g 2>/dev/null | grep -E '@tanstack/'

# Recherche de @tanstack/* dans tous tes projets node
find ~ -type d -name node_modules -prune -path '*/node_modules' 2>/dev/null \
  | head -200 \
  | while read d; do
      ls "$d/@tanstack" 2>/dev/null | sed "s|^|$d/@tanstack/|"
    done

# Recherche du fichier malveillant
find ~ -name 'router_init.js' 2>/dev/null

# Recherche du marker dans tous les package.json
grep -rE '"@tanstack/setup":\s*"github:tanstack/router#79ac49ee' \
  ~ 2>/dev/null --include=package.json
```

Croise les versions trouvées avec le tableau du §2.

### 4.2. Audit Claude Code (cible privilégiée du malware)

```bash
# Fichier de persistance principal
ls -la ~/.claude/router_runtime.js 2>/dev/null && echo "⚠️ INFECTÉ"

# Hooks suspects dans le settings global
grep -E 'router_runtime|router_init|getsession|tanstack/setup' \
  ~/.claude/settings.json 2>/dev/null

# Setup.mjs suspect
find ~/.claude -name 'setup.mjs' 2>/dev/null

# Sessions JSONL (cible d'exfiltration — vérifier qu'elles n'ont pas été lues récemment par un process inconnu)
ls -la ~/.claude/projects/*/*.jsonl 2>/dev/null | head
```

### 4.3. Audit VS Code

```bash
# Recherche dans tous tes workspaces
find ~ -type f \( -name 'setup.mjs' -path '*/.vscode/*' \
  -o -name 'tasks.json' -path '*/.vscode/*' \) 2>/dev/null \
  -exec grep -lE 'router_init|getsession|tanstack/setup|masscan\.cloud' {} \;
```

### 4.4. Audit système

```bash
# Processus suspects (le malware se cache derrière node/npm)
ps aux | grep -iE 'router_init|getsession|masscan' | grep -v grep

# Connexions sortantes vers les C2
lsof -i -P -n 2>/dev/null | grep -iE 'getsession|masscan|catbox'
# (alternativement : netstat -an | grep ESTABLISHED)

# DNS récemment résolus (macOS)
log show --predicate 'process == "mDNSResponder"' --last 7d 2>/dev/null \
  | grep -iE 'getsession|masscan|tanstack\.com|catbox\.moe'

# LaunchAgents/LaunchDaemons suspects (persistance macOS)
ls -la ~/Library/LaunchAgents/ /Library/LaunchAgents/ /Library/LaunchDaemons/ 2>/dev/null \
  | grep -iE 'tanstack|router|claude-update|setup'
```

### 4.5. Audit Git / GitHub

```bash
# Commits "dead-drop" potentiels dans tes repos
for repo in ~/Projects/*/; do
  cd "$repo" 2>/dev/null && \
    git log --all --author='claude@users.noreply.github.com' --since='2026-05-10' 2>/dev/null \
      | grep -B2 -A2 OhNoWhatsGoingOnWithGitHub
done

# Branches suspectes
for repo in ~/Projects/*/; do
  cd "$repo" 2>/dev/null && \
    git branch -a 2>/dev/null | grep -E 'dependabout/.*setup-formatter'
done
```

Vérifie aussi sur **github.com** côté Settings :

- Personal access tokens : aucun token créé/utilisé depuis le 2026-05-10 que tu ne reconnais pas ?
- SSH keys : aucune clé ajoutée que tu n'as pas générée ?
- Security log : pas de connexion depuis une IP inconnue ?

### 4.6. Outils communautaires de détection

- `GLPMC/Tanstack-Worm-Detector`
- `omarpr/mini-shai-hulud-ioc-scanner`

À lancer si tu veux un scan automatisé.

### 4.7. Scan tout-en-un (script à coller)

Scanner compact qui regroupe tous les IoCs (fichiers, hash, strings, persistance, connexions actives) en une passe. Par défaut il scanne `$HOME`, mais tu peux passer un autre chemin en argument. Read-only, ne touche à rien.

```bash
#!/usr/bin/env bash
# Scan IoCs CVE-2026-45321 (TanStack supply-chain compromise)
# Usage: bash tanstack-scan.sh [target_dir ...]   (défaut: $HOME)

set -u
TARGETS=("$@")
[ ${#TARGETS[@]} -eq 0 ] && TARGETS=("$HOME")
HITS_FILE=$(mktemp)
trap 'rm -f "$HITS_FILE"' EXIT

MALWARE_SHA='ab4fcadaec49c03278063dd269ea5eef82d24f2124a8e15d7b90f2fa8601266c'
IOC_REGEX='tanstack/router#79ac49eedf774dd4b0cfa308722bc463cfe5885c|OhNoWhatsGoingOnWithGitHub|IfYouRevokeThisTokenItWillWipeTheComputerOfTheOwner|svksjrhjkcejg|filev2\.getsession\.org|api\.masscan\.cloud|git-tanstack\.com|litter\.catbox\.moe/(h8nc9u|7rrc6l)'

# Dirs à exclure (caches énormes, mount points, poubelle)
PRUNE='-path */Library/Caches -o -path */Library/Mobile?Documents -o -path */.Trash -o -path */.git -o -path */.cache -o -path */Library/Containers'

hit() { echo "🚨 $1" | tee -a "$HITS_FILE"; }

echo "=== Scan IoCs TanStack CVE-2026-45321 sur ${TARGETS[*]} ==="
echo "(peut prendre 2-10 min selon la taille des cibles)"
echo

echo "[1/6] Fichiers nommés router_init.js / router_runtime.js..."
FOUND_FILES=$(find "${TARGETS[@]}" \( $PRUNE \) -prune -o \
  -type f \( -name 'router_init.js' -o -name 'router_runtime.js' \) -print 2>/dev/null)
if [ -n "$FOUND_FILES" ]; then
  echo "$FOUND_FILES"
  hit "fichier(s) au nom suspect détecté(s)"
fi

echo
echo "[2/6] Vérification SHA-256 du payload connu..."
if [ -n "$FOUND_FILES" ]; then
  while IFS= read -r f; do
    [ -f "$f" ] && shasum -a 256 "$f" 2>/dev/null
  done <<< "$FOUND_FILES" | tee /dev/stderr | grep -q "$MALWARE_SHA" && \
    hit "hash payload malveillant CONFIRMÉ"
fi

echo
echo "[3/6] Strings / markers IoC dans package.json, *.js, *.mjs, *.ts, *.json..."
MATCHES=$(find "${TARGETS[@]}" \( $PRUNE \) -prune -o \
  -type f \( -name 'package.json' -o -name '*.js' -o -name '*.mjs' -o -name '*.ts' -o -name '*.json' \) \
  -print 2>/dev/null \
  | xargs -P 4 -I{} grep -lE "$IOC_REGEX" "{}" 2>/dev/null)
if [ -n "$MATCHES" ]; then
  echo "$MATCHES"
  hit "marker(s) IoC trouvé(s) dans des fichiers"
fi

echo
echo "[4/6] Persistance Claude Code / VS Code..."
for f in "$HOME/.claude/router_runtime.js" "$HOME/.claude/setup.mjs"; do
  [ -e "$f" ] && { ls -la "$f"; hit "persistance Claude Code: $f"; }
done
VS_HITS=$(find "${TARGETS[@]}" \( $PRUNE \) -prune -o \
  -type f -path '*/.vscode/setup.mjs' -print 2>/dev/null)
if [ -n "$VS_HITS" ]; then
  echo "$VS_HITS"
  hit "persistance VS Code détectée"
fi
# Hooks suspects dans settings.json global Claude Code
if [ -f "$HOME/.claude/settings.json" ] && \
   grep -qE 'router_runtime|router_init|getsession|tanstack/setup' "$HOME/.claude/settings.json" 2>/dev/null; then
  hit "hook suspect dans ~/.claude/settings.json"
fi

echo
echo "[5/6] Connexions réseau actives vers les C2..."
NET=$(lsof -i -P -n 2>/dev/null | grep -iE 'getsession|masscan|catbox\.moe|git-tanstack')
if [ -n "$NET" ]; then
  echo "$NET"
  hit "connexion(s) sortante(s) vers C2 détectée(s)"
fi

echo
echo "[6/6] Versions @tanstack/* dans les node_modules locaux..."
find "${TARGETS[@]}" \( $PRUNE \) -prune -o \
  -type d -path '*/node_modules/@tanstack/*' -prune -print 2>/dev/null \
  | while IFS= read -r d; do
      pkg="$d/package.json"
      [ -f "$pkg" ] && awk -v p="$d" '
        /"name"/ { n=$0 }
        /"version"/ { v=$0; print p ": " n " " v; exit }
      ' "$pkg"
    done | tee /tmp/tanstack-versions.txt
echo "→ comparer manuellement avec les plages du §2 (versions à risque listées)"

echo
echo "=== Résumé ==="
if [ -s "$HITS_FILE" ]; then
  echo "🚨 COMPROMISSION POSSIBLE — $(wc -l < "$HITS_FILE") indicateur(s) :"
  cat "$HITS_FILE"
  echo
  echo "⛔ NE PAS révoquer de tokens avant d'avoir neutralisé la persistance (cf §5)."
else
  echo "✅ Aucun IoC détecté côté fichiers/processus/réseau."
  echo "   Vérifie quand même manuellement les versions @tanstack/* listées ci-dessus."
fi
```

Sauvegarde sous `~/tanstack-scan.sh` puis `bash ~/tanstack-scan.sh`. Si tu as un `$HOME` lourd (cloud-synced, photos, etc.), restreins-le : `bash ~/tanstack-scan.sh ~/Projects ~/.claude ~/.vscode` en passant tes répertoires utiles.

> Le script peut prendre quelques minutes à finir. Il est read-only — il liste, ne modifie rien. Les éventuels removals doivent être faits manuellement après lecture de §5.

---

## 5. Si tu trouves un signe de compromission

### Ordre **impératif** des actions

#### Étape 1 — Neutraliser la persistance (AVANT toute révocation de token)

Le dead-man's switch monitore le token GitHub. Si tu le révoques avant d'avoir tué le malware, il déclenche `rm -rf ~/`.

```bash
# Identifier et tuer les process malveillants
ps aux | grep -iE 'router_init|node.*\.claude/router' | grep -v grep
# kill -9 <pid>

# Supprimer les fichiers de persistance
rm -f ~/.claude/router_runtime.js ~/.claude/setup.mjs
# Restaurer ~/.claude/settings.json depuis backup git ou nettoyer manuellement les hooks ajoutés

# Supprimer la persistance VS Code dans chaque workspace concerné
find ~ -path '*/.vscode/setup.mjs' -delete 2>/dev/null
```

#### Étape 2 — Couper le réseau temporairement (pour empêcher exfiltration pendant que tu nettoies)

```bash
# Bloquer les domaines C2 dans /etc/hosts
sudo tee -a /etc/hosts <<EOF
0.0.0.0 filev2.getsession.org
0.0.0.0 api.masscan.cloud
0.0.0.0 git-tanstack.com
EOF
```

#### Étape 3 — Rotation des credentials (ordre de priorité Snyk)

1. **Tokens npm publish** + fédération OIDC
2. **Personal Access Tokens GitHub** (et auditer tous les repos pour des commits/branches non autorisés)
3. **Credentials AWS** (instance roles + clés utilisateur)
4. **Tokens HashiCorp Vault**
5. **Service accounts Kubernetes**
6. **Clés SSH privées**
7. **Credentials GCP**
8. **Tout secret visible dans tes sessions Claude Code** (`~/.claude/projects/*.jsonl`)

#### Étape 4 — Wipe propre

Idéalement : reformater la machine. Le malware peut planter des artefacts qu'on ne sait pas tous repérer. Si la machine a accès à des environnements prod ou des secrets sensibles, c'est important.

#### Étape 5 — Notification

- Si tu publishes des paquets npm : prévenir tes co-mainteneurs, le ver re-publie via les comptes compromis
- Si tu as poussé sur les repos pendant la fenêtre : auditer les diffs

---

## 6. Mesures préventives (recommandées pour tous)

### Côté pnpm

pnpm 11 a activé par défaut **deux protections supply-chain** qui auraient bloqué ce type d'attaque :

- `minimumReleaseAge: 1440` (1 jour) — pnpm n'installe pas un paquet publié il y a moins d'une journée.
- `blockExoticSubdeps: true` — bloque les dépendances exotiques (`github:`, `file:`, `git+ssh:`, …) en sub-dependency. Aurait empêché le marker `@tanstack/setup: github:tanstack/router#79ac49ee...`.

À configurer (déjà appliqué sur Sirena, cf §7.5) dans `pnpm-workspace.yaml` :

```yaml
# Durcissement à 7 jours (recommandation Snyk) au lieu du défaut pnpm 11 de 1440min
minimumReleaseAge: 10080
# Optionnel : exclure un paquet ponctuellement pour un hotfix critique
# minimumReleaseAgeExclude:
#   - package-with-critical-hotfix@1.2.3
```

⚠️ **Ne pas mettre `minimumReleaseAge: 0`** — c'est ce qui désactive la protection. Le défaut pnpm 11 (1440) est le minimum acceptable, 10080 (7 jours) est l'objectif Snyk.

À propos de `ignore-scripts` : pnpm 11 a déjà des protections autour des post-install scripts via la whitelist `allowBuilds` du workspace. Le contenu de cette liste doit être audité régulièrement et limité au strict nécessaire (sur Sirena : `@prisma/*`, `@sentry/cli`, `esbuild`, `msgpackr-extract`, `prisma`).

### Côté GitHub Actions

- Auditer tous les workflows qui utilisent `pull_request_target` : ils ne doivent **jamais** checkout du code contrôlé par le fork avec écriture sur le cache du base repo. ✅ Aucune occurrence sur Sirena.
- Pinner les actions tierces par **commit SHA** + commentaire de version (`uses: org/action@<sha> # vX.Y.Z`), pas par tag. ✅ Appliqué sur Sirena (cf §7.5).
- Configurer l'OIDC federation côté npm/AWS pour pinner sur un workflow et une branche spécifiques (pas juste le repo).
- Purger les caches GitHub Actions existants si `pull_request_target` est utilisé sur du code récent.

### Vigilance générale

- La preuve **SLSA Build Level 3** n'est plus une garantie : ce malware a produit des attestations valides parce que l'attaquant a hijacké le pipeline légitime.
- Analyse comportementale au moment de l'install (ex. Socket, Snyk, Aikido) > vérification de provenance seule.
- Avant tout `pnpm update`, regarder la date de publication des nouvelles versions (`npm view <pkg> time`). Une version sortie il y a < 24h sur un paquet critique = wait & see.

---

## 7. Statut Sirena — détail

| Vérification | Résultat |
|---|---|
| Versions `@tanstack/*` dans `pnpm-lock.yaml` (HEAD `ci/increase-limits`) | Toutes strictement inférieures aux plages compromises |
| Versions `@tanstack/*` sur les 7 derniers commits lockfile (du 2026-04-08 au 2026-05-11) | Idem, aucune jamais dans la plage compromise |
| Timing du dernier `pnpm install` (`91185ba1`, 2026-05-11 09:17 UTC) | ~10h avant publication des paquets malveillants (19:15 UTC) |
| Présence de `router_init.js` dans le repo | Absent |
| Marker `@tanstack/setup` dans `optionalDependencies` | Absent |
| Domaines C2 / strings de campagne dans le code | Absents |
| `.vscode/setup.mjs`, `.vscode/tasks.json` injecté | `.vscode/settings.json` propre (Biome + Prisma uniquement), pas de `setup.mjs` |
| `.claude/settings.local.json` (hooks injectés) | Propre, uniquement des permissions Bash/MCP |
| Paquets propagés par le ver (`@mistralai/mistralai`, `@uipath/*`) | Absents du lockfile |

### Versions actuelles vs plages compromises

| Paquet | Plage compromise | Version Sirena | Statut |
|---|---|---|---|
| `@tanstack/history` | 1.161.9–1.161.12 | 1.161.6 | ✅ |
| `@tanstack/react-router` | 1.169.5–1.169.8 | 1.169.2 | ✅ |
| `@tanstack/react-router-devtools` | 1.166.16–1.166.19 | 1.166.13 | ✅ |
| `@tanstack/router-core` | 1.169.5–1.169.8 | 1.169.2 | ✅ |
| `@tanstack/router-devtools-core` | 1.167.6–1.167.9 | 1.167.3 | ✅ |
| `@tanstack/router-generator` | 1.166.45–1.166.48 | 1.166.42 | ✅ |
| `@tanstack/router-plugin` | 1.167.38–1.167.41 | 1.167.35 | ✅ |
| `@tanstack/router-utils` | 1.161.11–1.161.14 | 1.161.8 | ✅ |
| `@tanstack/virtual-file-routes` | 1.161.10–1.161.13 | 1.161.7 | ✅ |
| `@tanstack/query-core`, `react-query`, `store`, `react-store` | non listés | — | ✅ |

**Conclusion** : aucune action de remédiation requise côté repo. Audit machines personnelles recommandé à tous les contributeurs ayant manipulé du JS récemment.

---

## 7.5. Mesures appliquées dans ce repo

Changements posés sur la branche au moment de la rédaction du rapport :

### `pnpm-workspace.yaml`

- `minimumReleaseAge: 0` → `minimumReleaseAge: 10080` (7 jours, recommandation Snyk).
  Le `0` était hérité du passage à pnpm 11 (commit `c373ea2b`, 2026-04-13) qui avait explicitement annulé le nouveau défaut (1440 min). Cette désactivation est l'écart de sécurité le plus critique remonté par cet audit : si l'incident TanStack avait précédé notre fenêtre de mise à jour du 2026-05-11, nous aurions installé les paquets compromis. La protection est désormais durcie au-delà du défaut pnpm 11.

### `.github/workflows/*.yaml`

Pinning par commit SHA des dernières actions encore référencées par tag (5 occurrences) :

- `auto-feature-branches.yaml:26` — `actions/checkout@v6.0.2` → `actions/checkout@0c366fd6...` (SHA déjà utilisé ailleurs dans le repo)
- `manual-deploy.yaml:28` et `:59` — idem
- `auto-test.yaml:20` et `:47` — idem

Le reste des workflows (`lint-and-test`, `auto-deploy`, `load-test`, `anonymize-smoke-test`, `security-scan`) était déjà pinné par SHA. Aucun workflow n'utilise `pull_request_target` (seul `security-scan.yaml` utilise le `pull_request:` standard, qui est safe).

### Non appliqué (décisions documentées)

- `ignore-scripts=true` global : non posé. pnpm 11 gère déjà finement via la whitelist `allowBuilds` du workspace. Imposer `ignore-scripts` globalement casserait les builds de `prisma`, `esbuild`, `@sentry/cli` etc. listés dans `allowBuilds`. La whitelist actuelle reste à auditer régulièrement.
- Pinning des actions par SHA dans `.github/actions/build-docker/*` et `.github/actions/deploy-gitops/*` (composite actions internes) : pas inspecté dans cet audit, à faire dans un PR séparé si nécessaire.
- Cooldown de 7 jours sur `minimumReleaseAge` : à ajuster vers 1440 (1 jour, défaut pnpm 11) si trop agressif pour les PRs Dependabot. La valeur peut être baissée sans impact sur le lockfile existant.

---

## 8. Références

- [GHSA-g7cv-rxg3-hmpx](https://github.com/advisories/GHSA-g7cv-rxg3-hmpx) — advisory principal CVE-2026-45321
- [GHSA-rmmr-r34h-pfm5](https://github.com/advisories/GHSA-rmmr-r34h-pfm5) — sub-advisory `@tanstack/history`
- [Snyk : TanStack npm packages compromised](https://snyk.io/blog/tanstack-npm-packages-compromised/) — analyse technique complète
