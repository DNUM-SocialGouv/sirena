# Third-Party API

API REST permettant à des partenaires tiers de créer des requêtes (fiches de signalement) dans Sirena.

## Authentification

Toutes les requêtes doivent inclure un header `X-API-Key` :

```
X-API-Key: sk_<64 caractères hexadécimaux>
```

| Code | Cas |
|------|-----|
| 401  | Clé absente, format invalide ou clé inconnue |
| 403  | Clé révoquée, suspendue ou expirée |

## Rate Limiting

Le rate limiter suit les tentatives échouées par IP :
- Après **5 échecs** consécutifs, l'IP est bannie temporairement
- Durée de ban exponentielle : 1 min, 2 min, 4 min, 8 min...
- Réponse `429 Too Many Requests` avec header `Retry-After`

## Traçabilité

Toutes les réponses incluent un header `x-trace-id` pour le suivi.

---

## Endpoints

### Test de connexion

```
GET /third-party/v1
```

Vérifie que la clé API est valide.

**Réponse 200** :
```json
{
  "message": "Authentication successful",
  "accountId": "string",
  "keyPrefix": "string"
}
```

---

### Créer une requête

```
POST /third-party/v1/requetes
```

Crée une fiche de signalement complète avec déclarant, victime, situations, faits et démarches.

**Corps de la requête** :

```jsonc
{
  "receptionDate": "2026-02-18T10:30:00.000Z",  // optionnel, ISO 8601
  "declarant": {
    "nom": "string",              // requis
    "prenom": "string",           // requis
    "civiliteId": "string",       // optionnel, → GET /enums/civilite
    "email": "user@example.com",  // optionnel
    "ageId": "string",            // optionnel, → GET /enums/age
    "telephone": "string",        // optionnel
    "estHandicapee": true,        // optionnel
    "lienVictimeId": "string",    // optionnel, → GET /enums/lien-victime
    "estVictime": true,           // optionnel
    "veutGarderAnonymat": true,   // optionnel
    "commentaire": "string",      // optionnel
    "adresse": {                  // optionnel
      "label": "string",
      "numero": "string",
      "rue": "string",
      "codePostal": "string",
      "ville": "string"
    }
  },
  "victime": {
    "nom": "string",              // requis
    "prenom": "string",           // requis
    "civiliteId": "string",       // optionnel, → GET /enums/civilite
    "email": "user@example.com",  // optionnel
    "ageId": "string",            // optionnel, → GET /enums/age
    "telephone": "string",        // optionnel
    "estHandicapee": true,        // optionnel
    "commentaire": "string",      // optionnel
    "veutGarderAnonymat": true,   // optionnel
    "estVictimeInformee": true,   // optionnel
    "autrePersonnes": "string",   // optionnel
    "adresse": { ... }            // optionnel, même structure que ci-dessus
  },
  "situations": [                 // requis, au moins 1
    {
      "lieuDeSurvenue": {         // optionnel
        "lieuTypeId": "string",   // → GET /enums/lieu-type
        "lieuPrecision": "string",
        "codePostal": "string",
        "commentaire": "string",
        "finess": "string",
        "tutelle": "string",
        "categCode": "string",
        "categLib": "string",
        "transportTypeId": "string",
        "societeTransport": "string",
        "adresse": { ... }
      },
      "misEnCause": {             // optionnel
        "misEnCauseTypeId": "string",         // → GET /enums/mis-en-cause-type
        "misEnCauseTypePrecisionId": "string",
        "rpps": "string",
        "commentaire": "string"
      },
      "demarchesEngagees": {      // optionnel
        "demarches": ["string"],              // → GET /enums/demarche
        "dateContactEtablissement": "ISO 8601",
        "etablissementARepondu": true,
        "commentaire": "string",
        "datePlainte": "ISO 8601",
        "autoriteTypeId": "string"            // → GET /enums/autorite-type
      },
      "faits": [                  // optionnel
        {
          "motifsDeclaratifs": ["string"],    // → GET /enums/motif-declaratif
          "consequences": ["string"],          // → GET /enums/consequence
          "maltraitanceTypes": ["string"],     // → GET /enums/maltraitance-type
          "dateDebut": "ISO 8601",
          "dateFin": "ISO 8601",
          "commentaire": "string"
        }
      ]
    }
  ]
}
```

**Réponse 200** :
```json
{
  "requeteId": "2026-02-RT1",
  "receptionDate": "2026-02-18T10:30:00.000Z",
  "receptionTypeId": "TELEPHONE",
  "createdAt": "2026-02-18T10:30:00.000Z"
}
```

---

### Ajouter une pièce jointe

```
POST /third-party/v1/requetes/:requeteId/attachments
```

Ajoute un fichier à une requête existante appartenant au compte tiers appelant.

**Content-Type** : `multipart/form-data`
**Champ** : `file`

**Types MIME autorisés** : PDF, Word, Excel, PowerPoint, OpenDocument, images (JPEG, PNG, HEIC, WebP, TIFF), emails (.eml, .msg), CSV, texte.

**Taille max** : 200 Mo

**Réponse 200** :
```json
{
  "fileId": "string",
  "fileName": "string",
  "mimeType": "string",
  "size": 12345
}
```

| Code | Cas |
|------|-----|
| 400  | Fichier absent, type non autorisé, ou taille dépassée |
| 404  | Requête introuvable ou n'appartenant pas au compte |

---

## Énumérations

Tous les endpoints d'énumérations retournent directement un tableau JSON :

```json
[
  { "id": "string", "label": "string" }
]
```

| Endpoint | Description |
|----------|-------------|
| `GET /third-party/v1/enums/age` | Tranches d'âge |
| `GET /third-party/v1/enums/civilite` | Civilités (M, Mme...) |
| `GET /third-party/v1/enums/lien-victime` | Lien avec la victime |
| `GET /third-party/v1/enums/mis-en-cause-type` | Types de mis en cause (avec précisions) |
| `GET /third-party/v1/enums/motif-declaratif` | Motifs déclaratifs |
| `GET /third-party/v1/enums/consequence` | Conséquences |
| `GET /third-party/v1/enums/maltraitance-type` | Types de maltraitance |
| `GET /third-party/v1/enums/autorite-type` | Types d'autorité |
| `GET /third-party/v1/enums/demarche` | Types de démarches engagées |
| `GET /third-party/v1/enums/lieu-type` | Types de lieu de survenue |

### Cas particulier : `mis-en-cause-type`

Cet endpoint retourne des informations supplémentaires :

```json
[
  {
    "id": "PROFESSIONNEL_SANTE",
    "label": "Professionnel de santé",
    "fields": ["rpps", "civilite", "nom", "prenom"],
    "precisions": [
      { "id": "MEDECIN", "label": "Médecin", "misEnCauseTypeId": "PROFESSIONNEL_SANTE" }
    ]
  }
]
```

- `fields` : champs attendus dans `misEnCause` pour ce type
- `precisions` : valeurs possibles pour `misEnCauseTypePrecisionId`

---

## Exemple complet

```bash
# 1. Tester la connexion
curl -H "X-API-Key: sk_..." https://api.sirena.gouv.fr/third-party/v1

# 2. Récupérer les énumérations
curl -H "X-API-Key: sk_..." https://api.sirena.gouv.fr/third-party/v1/enums/age

# 3. Créer une requête
curl -X POST https://api.sirena.gouv.fr/third-party/v1/requetes \
  -H "X-API-Key: sk_..." \
  -H "Content-Type: application/json" \
  -d '{
    "declarant": { "nom": "Durand", "prenom": "Marie" },
    "victime": { "nom": "Durand", "prenom": "Jean" },
    "situations": [{ "lieuDeSurvenue": {}, "misEnCause": {}, "demarchesEngagees": {} }]
  }'

# 4. Ajouter une pièce jointe
curl -X POST https://api.sirena.gouv.fr/third-party/v1/requetes/2026-02-RT1/attachments \
  -H "X-API-Key: sk_..." \
  -F "file=@document.pdf"
```
