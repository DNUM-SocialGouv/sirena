export const AGE = {
  '-18': '-18',
  '18-29': '18-29',
  '30-59': '30-59',
  '60-79': '60-79',
  '>= 80': '>= 80',
  Inconnu: 'Inconnu',
} as const;

export type Age = keyof typeof AGE;

export const ageLabels: Record<Age, string> = {
  '-18': 'Moins de 18 ans',
  '18-29': 'Entre 18 et 29 ans',
  '30-59': 'Entre 30 et 59 ans',
  '60-79': 'Entre 60 et 79 ans',
  '>= 80': '80 ans et plus',
  Inconnu: 'Inconnu',
};

export const CIVILITE = {
  M: 'M',
  MME: 'MME',
  MX: 'MX',
  NSP: 'NSP',
} as const;

export type Civilite = keyof typeof CIVILITE;

export const civiliteLabels: Record<Civilite, string> = {
  M: 'Monsieur',
  MME: 'Madame',
  MX: 'autre',
  NSP: 'Je ne souhaite pas répondre',
};

export const MIS_EN_CAUSE_TYPE = {
  MEMBRE_FAMILLE: 'MEMBRE_FAMILLE',
  PROCHE: 'PROCHE',
  PROFESSIONNEL: 'PROFESSIONNEL',
  AUTRE: 'AUTRE',
} as const;

export type MisEnCauseType = keyof typeof MIS_EN_CAUSE_TYPE;

export const misEnCauseTypeLabels: Record<MisEnCauseType, string> = {
  MEMBRE_FAMILLE: 'Membre de la famille',
  PROCHE: 'Proche',
  PROFESSIONNEL: 'Professionnel',
  AUTRE: 'Autre',
};

// MIS_EN_CAUSE_TYPE = LIEN_VICTIME
export const LIEN_VICTIME = MIS_EN_CAUSE_TYPE;
export type LienVictime = MisEnCauseType;
export const lienVictimeLabels: Record<LienVictime, string> = misEnCauseTypeLabels;

export const MOTIF = {
  PROBLEME_COMPORTEMENTAL: 'PROBLEME_COMPORTEMENTAL',
  PROBLEME_FACTURATION: 'PROBLEME_FACTURATION',
  PROBLEME_LOCAUX: 'PROBLEME_LOCAUX',
  NON_RESPECT_DROITS: 'NON_RESPECT_DROITS',
  PROBLEME_ORGANISATION: 'PROBLEME_ORGANISATION',
  PROBLEME_QUALITE_SOINS: 'PROBLEME_QUALITE_SOINS',
  DIFFICULTES_ACCES_SOINS: 'DIFFICULTES_ACCES_SOINS',
  AUTRE: 'AUTRE',
} as const;

export type Motif = keyof typeof MOTIF;

export const motifLabels: Record<Motif, string> = {
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
};

export const motifShortLabels: Record<Motif, string> = {
  PROBLEME_COMPORTEMENTAL: 'Problème comportemental',
  PROBLEME_FACTURATION: 'Problème lié à la facturation',
  PROBLEME_LOCAUX: 'Problème lié aux locaux',
  NON_RESPECT_DROITS: 'Non-respect des droits des usagers',
  PROBLEME_ORGANISATION: 'Problème d’organisation',
  PROBLEME_QUALITE_SOINS: 'Problème de qualité des soins',
  DIFFICULTES_ACCES_SOINS: "Difficultés d'accès aux soins",
  AUTRE: 'Autre',
};

export const CONSEQUENCE = {
  SANTE: 'SANTE',
  DROITS: 'DROITS',
  BESOINS: 'BESOINS',
  SOCIAL: 'SOCIAL',
  AUTRE: 'AUTRE',
} as const;

export type Consequence = keyof typeof CONSEQUENCE;

export const consequenceLabels: Record<Consequence, string> = {
  SANTE: 'Sur la santé (douleurs, blessures, stress, angoisse, troubles du sommeil, fatigue, mal-être...)',
  DROITS: 'Sur les droits (impossible de porter plainte, d’être écouté, d’avoir un soutien...)',
  BESOINS:
    'Sur les besoins du quotidien (difficulté à manger, dormir, se laver, ou à recevoir l’aide dont elle a besoin...)',
  SOCIAL:
    'Sur la vie sociale ( isolement, rejet, mise à l’écart, difficulté à aller à l’école, au travail ou à participer à des activités...)',
  AUTRE: 'Autre conséquence',
};

export const MALTRAITANCE_TYPE = {
  PHYSIQUE: 'PHYSIQUE',
  SEXUELLE: 'SEXUELLE',
  PSYCHOLOGIQUE: 'PSYCHOLOGIQUE',
  MATERIELLE_FINANCIERE: 'MATERIELLE_FINANCIERE',
  NEGLIGENCES: 'NEGLIGENCES',
  DISCRIMINATION: 'DISCRIMINATION',
  INSTITUTIONNELLE: 'INSTITUTIONNELLE',
  AUTRE: 'AUTRE',
  NE_SAIS_PAS: 'NE_SAIS_PAS',
  NON: 'NON',
} as const;

export type MaltraitanceType = keyof typeof MALTRAITANCE_TYPE;

export const maltraitanceTypeLabels: Record<MaltraitanceType, string> = {
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
};

export const LIEU_TYPE = {
  DOMICILE: 'DOMICILE',
  ETABLISSEMENT_SANTE: 'ETABLISSEMENT_SANTE',
  ETABLISSEMENT_HEBERGEMENT: 'ETABLISSEMENT_HEBERGEMENT',
  ETABLISSEMENT_SERVICE_SOCIAL: 'ETABLISSEMENT_SERVICE_SOCIAL',
  CABINET_MEDICAL: 'CABINET_MEDICAL',
  TRAJET: 'TRAJET',
  AUTRE: 'AUTRE',
} as const;

export type LieuType = keyof typeof LIEU_TYPE;

export const lieuTypeLabels: Record<LieuType, string> = {
  DOMICILE: "Au domicile (domicile de la victime, domicile d'un membre de la famille, domicile d'un aidant...)",
  ETABLISSEMENT_SANTE: 'Dans un établissement de santé (hôpital, clinique, laboratoire, pharmacie ...)',
  ETABLISSEMENT_HEBERGEMENT: "Dans un établissement d'hébergement (EHPAD, foyer d'accueil et d'hébergement ...)",
  ETABLISSEMENT_SERVICE_SOCIAL:
    "Dans un établissement ou service social (Centre de jour, service d'aide, service Mandataire Judiciaire à la Protection des Majeurs...)",
  CABINET_MEDICAL: 'Dans un cabinet médical (dentiste, orthopédique, pédiatrie, médecin généraliste...)',
  TRAJET: 'Durant le trajet (transport sanitaire, SAMU, Pompier)',
  AUTRE: "Autre (institut d'esthétique, salon de tatouage, prison)",
};

export const PROFESSION_DOMICILE_TYPE = {
  PROF_LIBERAL: 'PROF_LIBERAL',
  HAD: 'HAD',
  SESSAD: 'SESSAD',
  AIDE_MENAGERE: 'AIDE_MENAGERE',
  REPAS: 'REPAS',
  TRAITEMENT: 'TRAITEMENT',
  SAADF: 'SAADF',
  MJPM: 'MJPM',
  SSIAD: 'SSIAD',
  SAAD: 'SAAD',
  AUTRE: 'AUTRE',
};

export type ProfessionDomicileType = keyof typeof PROFESSION_DOMICILE_TYPE;

export const professionDomicileTypeLabels: Record<ProfessionDomicileType, string> = {
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
};

export const TRANSPORT_TYPE = {
  ASSU: 'ASSU',
  VSAV: 'VSAV',
  AMBULANCE: 'AMBULANCE',
  VSL: 'VSL',
  TAXI: 'TAXI',
  AUTRE: 'AUTRE',
} as const;

export type TransportType = keyof typeof TRANSPORT_TYPE;

export const transportTypeLabels: Record<TransportType, string> = {
  ASSU: "Ambulance de secours et de soins d'urgence (ASSU)",
  VSAV: "Véhicule de secours et d'assistance aux victimes (VSAV)",
  AMBULANCE: 'Ambulance',
  VSL: 'Véhicule sanitaire léger',
  TAXI: 'Chauffeur de taxi',
  AUTRE: 'Autre type de transport',
};

export const PROFESSION_TYPE = {
  PROF_SANTE: 'PROF_SANTE',
  TRAVAILLEUR_SOCIAL: 'TRAVAILLEUR_SOCIAL',
  PROF_SOIN: 'PROF_SOIN',
  RESPONSABLE: 'RESPONSABLE',
  MJPM: 'MJPM',
  AUTRE: 'AUTRE',
} as const;

export type ProfessionType = keyof typeof PROFESSION_TYPE;

export const professionTypeLabels: Record<ProfessionType, string> = {
  PROF_SANTE:
    'Un professionnel de santé (médecin généraliste, spécialiste, dentiste, kinésithérapeute, orthophoniste, infirmier, aide-soignant...)',
  TRAVAILLEUR_SOCIAL: 'Travailleur social (éducateur, assistant social...)',
  PROF_SOIN: 'Un professionnel du soin (coiffeur, esthéticienne, naturopathe, ...)',
  RESPONSABLE: 'Responsable (directeur, cadre de santé...)',
  MJPM: 'Mandataire judiciaire à la protection des majeurs (curateur, tuteur...)',
  AUTRE: 'Autre (animateur, agent d’entretien...)',
};

export const RECEPTION_TYPE = {
  EMAIL: 'EMAIL',
  COURRIER: 'COURRIER',
  FORMULAIRE: 'FORMULAIRE',
  PLATEFORME: 'PLATEFORME',
  TELEPHONE: 'TELEPHONE',
  AUTRE: 'AUTRE',
} as const;

export type ReceptionType = keyof typeof RECEPTION_TYPE;

export const receptionTypeLabels: Record<ReceptionType, string> = {
  EMAIL: 'Courrier électronique',
  COURRIER: 'Courrier postal',
  FORMULAIRE: 'Formulaire',
  PLATEFORME: 'Plateforme téléphonique',
  TELEPHONE: 'Téléphone',
  AUTRE: 'Autre',
};

export const AUTORITE_TYPE = {
  GENDARMERIE: 'GENDARMERIE',
  COMMISSARIAT: 'COMMISSARIAT',
  TRIBUNAL: 'TRIBUNAL',
} as const;

export type AutoriteType = keyof typeof AUTORITE_TYPE;

export const autoriteTypeLabels: Record<AutoriteType, string> = {
  GENDARMERIE: 'Gendarmerie',
  COMMISSARIAT: 'Commissariat',
  TRIBUNAL: 'Tribunal',
};

export const DEMARCHES_ENGAGEES = {
  CONTACT_RESPONSABLES: 'CONTACT_RESPONSABLES',
  CONTACT_ORGANISME: 'CONTACT_ORGANISME',
  PLAINTE: 'PLAINTE',
} as const;

export type DemarchesEngagees = keyof typeof DEMARCHES_ENGAGEES;

export const demarcheEngageeLabels: Record<DemarchesEngagees, string> = {
  CONTACT_RESPONSABLES: "Prise de contact avec l'établissement ou les responsables des faits",
  CONTACT_ORGANISME: "Démarches engagées auprès d'autres organismes",
  PLAINTE: 'Dépôt de plainte',
};
