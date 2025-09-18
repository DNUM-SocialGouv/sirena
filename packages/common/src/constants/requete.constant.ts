export const ages = {
  '-18': 'Moins de 18 ans',
  '18-29': 'Entre 18 et 29 ans',
  '30-59': 'Entre 30 et 59 ans',
  '60-79': 'Entre 60 et 79 ans',
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
  PROCHE: 'Proche',
  PROFESSIONNEL: 'Professionnel',
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
  SANTE: 'Sur la santé (douleurs, blessures, stress, angoisse, troubles du sommeil, fatigue, mal-être...)',
  DROITS: 'Sur les droits (impossible de porter plainte, d’être écouté, d’avoir un soutien...)',
  BESOINS:
    'Sur les besoins du quotidien (difficulté à manger, dormir, se laver, ou à recevoir l’aide dont elle a besoin...)',
  SOCIAL:
    'Sur la vie sociale ( isolement, rejet, mise à l’écart, difficulté à aller à l’école, au travail ou à participer à des activités...)',
  AUTRE: 'Autre conséquence',
} as const;

export const maltraitanceTypes = {
  PHYSIQUE:
    'Oui, de la maltraitance physique (châtiments corporels, agressions physiques, intervention médicale sans consentement éclairé, enfermement...)',
  SEXUELLE:
    'Oui, de la maltraitance sexuelle (viols, agressions sexuelles, atteintes sexuelles, attentats à la pudeur...)',
  PSYCHOLOGIQUE:
    'Oui, de la maltraitance psychologique (humiliations, insulte, intimidation, harcèlement, menaces, dénigrement, isolement...)',
  MATERIELLE_FINANCIERE:
    "Oui, de la maltraitance matérielles et financières (fraude, vol d'effets personnels d'argent ou de biens, privation de gestion de ses ressources, dégradation de biens d'une personne...)",
  NEGLIGENCES: "Oui, de la négligence, abandon, privation (manque de soins, de nourriture, d'hygiène, de sécurité)",
  DISCRIMINATION:
    "Oui, de la discrimination (accès difficile, dégradé ou impossible aux droits aux soins ou prestations sociales ou à l'information...)",
  INSTITUTIONNELLE:
    'Oui, de la violence institutionnelle (traitement abusif de la part de structures ou d’institutions, menaces, soumission à des actes, comportements ou images violents...)',
  AUTRE: 'Oui, un autre type de maltraitance',
  NE_SAIS_PAS: "Je ne sais pas si j'ai subi de la maltraitance",
  NON: "Non, je n'ai pas subi de maltraitance",
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
  PROF_LIBERAL: "Intervention d'un professionnel libéral ou service (SAMU, médecin)",
  HAD: 'Hospitalisation à domicile',
  SESSAD: "Service d'éducation spéciale et de soins",
  AIDE_MENAGERE: "Service d'aide ménagère",
  REPAS: 'Service de repas',
  TRAITEMENT: 'Traitements spécialisés',
  SAADF: "Service d'Aide et d'Accompagnement à Domicile aux Familles (SAADF)",
  MJPM: 'Mandataire Judiciaire à la Protection des Majeurs (curatelle, tutelle)',
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
  PROF_SANTE:
    'Un professionnel de santé (médecin généraliste, spécialiste, dentiste, kinésithérapeute, orthophoniste, infirmier, aide-soignant...)',
  TRAVAILLEUR_SOCIAL: 'Travailleur social (éducateur, assistant social...)',
  PROF_SOIN: 'Un professionnel du soin (coiffeur, esthéticienne, naturopathe, ...)',
  RESPONSABLE: 'Responsable (directeur, cadre de santé...)',
  MJPM: 'Mandataire judiciaire à la protection des majeurs (curateur, tuteur...)',
  AUTRE: 'Autre (animateur, agent d’entretien...)',
} as const;

export const RECEPTION_TYPES = {
  EMAIL: 'EMAIL',
  COURRIER: 'COURRIER',
  FORMULAIRE: 'FORMULAIRE',
  PLATEFORME: 'PLATEFORME',
  TELEPHONE: 'TELEPHONE',
  AUTRE: 'AUTRE',
} as const;

type ReceptionType = keyof typeof RECEPTION_TYPES;

export const receptionTypes: Record<ReceptionType, string> = {
  EMAIL: 'Courrier électronique',
  COURRIER: 'Courrier postal',
  FORMULAIRE: 'Formulaire',
  PLATEFORME: 'Plateforme téléphonique',
  TELEPHONE: 'Téléphone',
  AUTRE: 'Autre',
};

export const autoritesTypes = {
  GENDARMERIE: 'Gendarmerie',
  COMMISSARIAT: 'Commissariat',
  TRIBUNAL: 'Tribunal',
} as const;

export const demarchesEngageesTypes = {
  CONTACT_RESPONSABLES: "Prise de contact avec l'établissement ou les responsables des faits",
  CONTACT_ORGANISME: "Démarches engagées auprès d'autres organismes",
  PLAINTE: 'Dépôt de plainte',
} as const;
