export const ages = {
  '-18': 'Moins de 18 ans',
  '18-29': '18 à 29 ans',
  '30-59': '30 à 59 ans',
  '60-79': '60 à 79 ans',
  '>= 80': '80 ans et plus',
  Inconnu: 'Inconnu',
} as const;

export const civilites = {
  M: 'Monsieur',
  MME: 'Madame',
  MX: 'autre',
  NSP: 'Je ne souhaite pas répondre',
} as const;

export const misEnCauseTypes = {
  MEMBRE_FAMILLE: 'Membre de la famille',
  PROCHE: 'Proche (ami, voisin...)',
  PROFESSIONNEL: 'Professionnel',
  PROFESSIONNEL_DOMICILE: "Professionnel dans le cadre d'un service ou d'une intervention à domicile",
  AUTRE: 'Autre',
} as const;

// actually it's the same
export const liensVictime = misEnCauseTypes;

export const motifs = {
  PROBLEME_COMPORTEMENTAL: 'Problème comportemental, relationnel ou de communication avec une personne',
  PROBLEME_FACTURATION: 'Problème lié à la facturation ou aux honoraires',
  PROBLEME_LOCAUX: 'Problème lié aux locaux ou la restauration',
  NON_RESPECT_DROITS:
    "Non-respect des droits des usagers dont défaut d’information (ex : non prise en compte de l'expression de besoin de la personne accompagnée, travail illégal...)",
  PROBLEME_ORGANISATION:
    'Problème d’organisation ou de fonctionnement de l’établissement ou du service (ex : Management, plannings, condition de travail...)',
  PROBLEME_QUALITE_SOINS:
    'Problème de qualité des soins médicaux ou paramédicaux (ex: soins et/ou interventions inadaptés, absents ou abusifs...)',
  DIFFICULTES_ACCES_SOINS:
    "Difficultés d'accès aux soins (établissement ou professionnel) (ex: manque de moyen humain...)",
  AUTRE: 'Autre (ex: tatouage, chirurgie et/ou soins esthétiques...)',
} as const;

export const consequences = {
  SANTE: 'Sur la santé physique et/ou psychique (blessures, troubles de la santé ou mentaux...)',
  DROITS: 'Sur les droits (violation du droit de la protection et sécurité, accès limité à la justice...)',
  BESOINS: 'Sur les besoins fondamentaux et spécifiques (notamment des besoins vitaux...)',
  SOCIAL: 'Sur le développement, la participation sociale (isolement, rejet...)',
  AUTRE: 'Autre conséquence',
} as const;

export const maltraitanceTypes = {
  PHYSIQUE:
    'Maltraitance physique (châtiments corporels, agressions physiques, intervention médicale sans consentement éclairé, enfermement...)',
  SEXUELLE: 'Maltraitance sexuelle (viols, agressions sexuelles, atteintes sexuelles, attentats à la pudeur...)',
  PSYCHOLOGIQUE:
    'Maltraitance psychologique (humiliations, insulte, intimidation, harcèlement, menaces, dénigrement, isolement...)',
  MATERIELLE_FINANCIERE:
    "Maltraitance matérielles et financières (fraude, vol d'effets personnels d'argent ou de biens, privation de gestion de ses ressources, dégradation de biens d'une personne...)",
  NEGLIGENCES: "Négligence, abandon, privation (manque de soins, de nourriture, d'hygiène, de sécurité)",
  DISCRIMINATION:
    "Discrimination (accès difficile, dégradé ou impossible aux droits aux soins ou prestations sociales ou à l'information...)",
  INSTITUTIONNELLE:
    'Violence institutionnelle (traitement abusif de la part de structures ou d’institutions, menaces, soumission à des actes, comportements ou images violents...)',
  AUTRE: 'Autre type de maltraitance',
} as const;

export const lieuTypes = {
  DOMICILE: "Au domicile (domicile de la victime, domicile d'un membre de la famille, domicile d'un aidant...)",
  ETABLISSEMENT_SANTE: 'Dans un établissement de santé (hôpital, clinique, laboratoire, pharmacie ...)',
  ETABLISSEMENT_HEBERGEMENT: "Dans un établissement d'hébergement (EHPAD, foyer d'accueil et d'hébergement ...)",
  ETABLISSEMENT_SERVICE_SOCIAL:
    "Dans un établissement ou service social (Centre de jour, service d'aide, service Mandataire Judiciaire à la Protection des Majeurs...)",
  CABINET_MEDICAL: 'Dans un cabinet médical (dentiste, orthopédique, pédiatrie, médecin généraliste...)',
  TRAJET: 'Durant le trajet (transport sanitaire, SAMU, Pompier)',
  AUTRE: "Autre (institut d'esthétique, salon de tatouage, prison)",
} as const;

export const professionDomicileTypes = {
  HAD: 'Hospitalisation à domicile',
  SESSAD: "Service d'éducation spéciale et de soins",
  AIDE_MENAGERE: "Service d'aide ménagère",
  REPAS: 'Service de repas',
  TRAITEMENT: 'Traitements spécialisés',
  SAADF: "Service d'Aide et d'Accompagnement à Domicile aux Familles (SAADF)",
  MJPM: 'Mandataire Judiciaire à la Protection des Majeurs (curatelle, tutelle)',
  PROF_LIBERAL: "Intervention d'un professionnel libéral ou service (SAMU, médecin)",
  SSIAD: 'Service de Soins Infirmier à Domicile (SSIAD)',
  SAAD: "Service d'Aide et d'Accompagnement à Domicile (SAAD)",
  AUTRE: 'Autre',
} as const;

export const transportTypes = {
  ASSU: "Ambulance de secours et de soins d'urgence (ASSU)",
  VSAV: "Véhicule de secours et d'assistance aux victimes (VSAV)",
  AMBULANCE: 'Ambulance',
  VSL: 'Véhicule sanitaire léger',
  TAXI: 'Chauffeur de taxi',
  AUTRE: 'Autre type de transport',
} as const;

export const professionTypes = {
  PROF_SANTE: 'Un professionnel de santé (médecin, infirmier, aide-soignant, kiné, ostéopathe...)',
  PROF_SOIN: 'Un professionnel du soin (coiffeur, esthéticienne, naturopathe, ...)',
  AUTRE_PROF_SERVICE:
    "Un autre professionnel d'établissement ou de service (directeur, animateur, agent d'entretien...)",
  TRAVAILLEUR_SOCIAL: 'Travailleur social (éducateur, assistant social...)',
  MJPM: 'Mandataire Judiciaire à la Protection des Majeurs (curatelle, tutelle)',
  AUTRE: 'Autre Professionnel',
} as const;

export const RECEPTION_TYPES = {
  EMAIL: 'EMAIL',
  COURRIER: 'COURRIER',
  FORUMULAIRE: 'FORUMULAIRE',
  PLATEFORME: 'PLATEFORME',
  TELEPHONE: 'TELEPHONE',
  AUTRE: 'AUTRE',
};

type ReceptionType = keyof typeof RECEPTION_TYPES;

export const receptionTypes: Record<ReceptionType, string> = {
  EMAIL: 'Courrier électronique',
  COURRIER: 'Courrier postal',
  FORUMULAIRE: 'Formulaire',
  PLATEFORME: 'Plateforme téléphonique',
  TELEPHONE: 'Téléphone',
  AUTRE: 'Autre',
} as const;

export const institutionPlainteTypes = {
  GENDARMERIE: 'Gendarmerie',
  COMMISSARIAT: 'Commissariat',
  TRIBUNAL: 'Tribunal',
} as const;
