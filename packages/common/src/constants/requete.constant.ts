// Attention aux espaces insécables dans les labels renvoyées par dematSocial

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
  AUTRE_PERSONNE_NON_PRO: 'AUTRE_PERSONNE_NON_PRO',
  PROFESSIONNEL_SANTE: 'PROFESSIONNEL_SANTE',
  PROFESSIONNEL_SOCIAL: 'PROFESSIONNEL_SOCIAL',
  AUTRE_PROFESSIONNEL: 'AUTRE_PROFESSIONNEL',
  ETABLISSEMENT: 'ETABLISSEMENT',
  PROCHE: 'PROCHE',
} as const;

export type MisEnCauseType = keyof typeof MIS_EN_CAUSE_TYPE;

export const misEnCauseTypeLabels: Record<MisEnCauseType, string> = {
  MEMBRE_FAMILLE: 'Membre de la famille',
  PROCHE: 'Proche (ami, voisin,...)',
  AUTRE_PERSONNE_NON_PRO: 'Autre personne non professionnelle',
  PROFESSIONNEL_SANTE:
    'Professionnel de santé (médecin généraliste, spécialiste, dentiste, kinésithérapeute, orthophoniste, infirmier, aide-soignant...)',
  PROFESSIONNEL_SOCIAL: 'Professionnel social (éducateur, assistant social...)',
  ETABLISSEMENT: 'Un établissement ou un service',
  AUTRE_PROFESSIONNEL: 'Autre professionnel',
};

// Précisions pour chaque type de mis en cause
export const MIS_EN_CAUSE_FAMILLE_PRECISION = {
  PARENT: 'PARENT',
  CONJOINT: 'CONJOINT',
  ENFANT: 'ENFANT',
  AUTRE: 'AUTRE',
} as const;

export type MisEnCauseFamillePrecision = keyof typeof MIS_EN_CAUSE_FAMILLE_PRECISION;

export const misEnCauseFamillePrecisionLabels: Record<MisEnCauseFamillePrecision, string> = {
  PARENT: 'Parent',
  CONJOINT: 'Conjoint - conjointe',
  ENFANT: 'Enfant',
  AUTRE: 'Autre',
};

export const MIS_EN_CAUSE_PROCHE_PRECISION = {
  ENTOURAGE_SOCIAL: 'ENTOURAGE_SOCIAL',
  AUTRE: 'AUTRE',
} as const;

export type MisEnCauseProchePrecision = keyof typeof MIS_EN_CAUSE_PROCHE_PRECISION;

export const misEnCauseProchePrecisionLabels: Record<MisEnCauseProchePrecision, string> = {
  ENTOURAGE_SOCIAL: 'Entourage social (ami, voisin...)',
  AUTRE: 'Autre',
};

export const MIS_EN_CAUSE_ETABLISSEMENT_PRECISION = {
  ETABLISSEMENT: 'ETABLISSEMENT',
  SERVICE: 'SERVICE',
  SAMSAH: 'SAMSAH',
  SAVS: 'SAVS',
  SESSAD: 'SESSAD',
  SPST: 'SPST',
  SAEMO: 'SAEMO',
  SAED: 'SAED',
  AUTRE: 'AUTRE',
} as const;

export type MisEnCauseEtablissementPrecision = keyof typeof MIS_EN_CAUSE_ETABLISSEMENT_PRECISION;

export const misEnCauseEtablissementPrecisionLabels: Record<MisEnCauseEtablissementPrecision, string> = {
  ETABLISSEMENT: 'Etablissement où se sont déroulés les faits',
  SERVICE: "Services de soins infirmiers ou d'aide à domicile (SAAD, SSIAD, SPASAD)",
  SAMSAH: 'SAMSAH',
  SAVS: "SAVS (Service d'accompagnement à la vie sociale)",
  SESSAD: "SESSAD (Service d'Education Spéciale et de Soins à Domicile) non rattaché à un établissement",
  SPST: 'SPST',
  SAEMO: "SAEMO (services d'action éducative en milieu ouvert)",
  SAED: "SAED (Services d'action éducative à domicile)",
  AUTRE: 'Autre',
};

export const MIS_EN_CAUSE_AUTRE_NON_PRO_PRECISION = {
  AUTRE: 'AUTRE',
} as const;

export type MisEnCauseAutreNonProPrecision = keyof typeof MIS_EN_CAUSE_AUTRE_NON_PRO_PRECISION;

export const misEnCauseAutreNonProPrecisionLabels: Record<MisEnCauseAutreNonProPrecision, string> = {
  AUTRE: 'Autre (patient ou résident, inconnu, escroc...)',
};

export const LIEN_VICTIME = {
  MEMBRE_FAMILLE: 'MEMBRE_FAMILLE',
  PROCHE: 'PROCHE',
  PROFESSIONNEL: 'PROFESSIONNEL',
  AUTRE: 'AUTRE',
} as const;

export type LienVictime = keyof typeof LIEN_VICTIME;

export const lienVictimeLabels: Record<LienVictime, string> = {
  MEMBRE_FAMILLE: 'Membre de la famille',
  PROCHE: 'Proche',
  PROFESSIONNEL: 'Professionnel',
  AUTRE: 'Autre',
};

// Union type for all MisEnCauseTypePrecisionEnum values
export type MisEnCauseTypePrecisionUnion =
  | MisEnCauseFamillePrecision
  | MisEnCauseProchePrecision
  | MisEnCauseAutreNonProPrecision
  | ProfessionSantePrecision
  | ProfessionSocialPrecision
  | AutreProfessionnelPrecision
  | ProfessionType
  | ProfessionDomicileType;

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
  AUCUNE: 'AUCUNE',
} as const;

export type Consequence = keyof typeof CONSEQUENCE;

export const consequenceLabels: Record<Consequence, string> = {
  SANTE: 'Sur la santé (douleurs, blessures, stress, angoisse, troubles du sommeil, fatigue, mal-être...)',
  DROITS: "Sur les droits (impossible de porter plainte, d'être écouté, d'avoir un soutien...)",
  BESOINS:
    "Sur les besoins du quotidien (difficulté à manger, dormir, se laver, ou à recevoir l'aide dont elle a besoin...)",
  SOCIAL:
    "Sur la vie sociale ( isolement, rejet, mise à l'écart, difficulté à aller à l'école, au travail ou à participer à des activités...)",
  AUCUNE: 'Aucune de ces conséquences',
};

export const MALTRAITANCE_TYPE = {
  NEGLIGENCES: 'NEGLIGENCES',
  VIOLENCES: 'VIOLENCES',
  MATERIELLE_FINANCIERE: 'MATERIELLE_FINANCIERE',
  SEXUELLE: 'SEXUELLE',
  NON: 'NON',
} as const;

export type MaltraitanceType = keyof typeof MALTRAITANCE_TYPE;

export const maltraitanceTypeLabels: Record<MaltraitanceType, string> = {
  NEGLIGENCES: 'Manque de soins, de nourriture, d’hygiène ou de sécurité',
  VIOLENCES: 'Insultes, coups, soin médical ou isolement forcé, autres violences',
  MATERIELLE_FINANCIERE: 'Vol d’argent ou d’objets, confiscation',
  SEXUELLE:
    'Contact physique sans accord sur les parties intimes, attouchements forcés, exhibitionnisme, relation sexuelle forcée',
  NON: 'Aucune de ces situations',
};

export const MALTRAITANCEQUALIFIED_TYPE = {
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

export type MaltraitanceQualifiedType = keyof typeof MALTRAITANCEQUALIFIED_TYPE;

export const maltraitanceQualifiedLabels: Record<MaltraitanceQualifiedType, string> = {
  PHYSIQUE: 'Maltraitance physique',
  SEXUELLE: 'Maltraitance sexuelle',
  PSYCHOLOGIQUE: 'Maltraitance psychologique',
  MATERIELLE_FINANCIERE: 'Maltraitance matérielles et financières',
  NEGLIGENCES: 'Négligence, abandon, privation (maltraitance)',
  DISCRIMINATION: 'Discrimination (maltraitance)',
  INSTITUTIONNELLE: 'Violence institutionnelle (maltraitance)',
  AUTRE: 'Autre maltraitance',
  NE_SAIS_PAS: 'Ne sait pas si a subi de la maltraitance',
  NON: '',
};

export const LIEU_TYPE = {
  DOMICILE: 'DOMICILE',
  ETABLISSEMENT_SANTE: 'ETABLISSEMENT_SANTE',
  ETABLISSEMENT_PERSONNES_AGEES: 'ETABLISSEMENT_PERSONNES_AGEES',
  ETABLISSEMENT_HANDICAP: 'ETABLISSEMENT_HANDICAP',
  ETABLISSEMENT_SOCIAL: 'ETABLISSEMENT_SOCIAL',
  AUTRES_ETABLISSEMENTS: 'AUTRES_ETABLISSEMENTS',
  TRAJET: 'TRAJET',
} as const;

export type LieuType = keyof typeof LIEU_TYPE;

export const lieuTypeLabels: Record<LieuType, string> = {
  DOMICILE: 'Domicile',
  ETABLISSEMENT_SANTE: 'Etablissements de santé',
  ETABLISSEMENT_PERSONNES_AGEES: 'Etablissements pour personnes âgées',
  ETABLISSEMENT_HANDICAP: 'Etablissements pour personnes handicapées',
  ETABLISSEMENT_SOCIAL: 'Etablissements sociaux',
  AUTRES_ETABLISSEMENTS: 'Autres établissements',
  TRAJET: 'Trajet',
};

// Domicile - Précisions
export const LIEU_DOMICILE_PRECISION = {
  PERSONNE_CONCERNEE: 'PERSONNE_CONCERNEE',
  REQUERANT: 'REQUERANT',
  CHEZ_TIERS: 'CHEZ_TIERS',
  HABITAT_INCLUSIF: 'HABITAT_INCLUSIF',
  EQUIPES_MOBILES: 'EQUIPES_MOBILES',
  AUTRE: 'AUTRE',
} as const;

export type LieuDomicilePrecision = keyof typeof LIEU_DOMICILE_PRECISION;

export const lieuDomicilePrecisionLabels: Record<LieuDomicilePrecision, string> = {
  PERSONNE_CONCERNEE: 'De la personne concernée',
  REQUERANT: 'Du réquérant',
  CHEZ_TIERS: 'Chez un tiers',
  HABITAT_INCLUSIF: 'Habitat inclusif',
  EQUIPES_MOBILES: 'Equipes mobiles',
  AUTRE: 'Autre',
};

// Etablissements de santé - Précisions
export const LIEU_ETABLISSEMENT_SANTE_PRECISION = {
  CH: 'CH',
  CHU: 'CHU',
  CABINET_MEDICAL: 'CABINET_MEDICAL',
  CLINIQUE: 'CLINIQUE',
  CLCC: 'CLCC',
  SSR_SMR: 'SSR_SMR',
  USLD: 'USLD',
  BAPU: 'BAPU',
  CMP: 'CMP',
  AUTRE: 'AUTRE',
} as const;

export type LieuEtablissementSantePrecision = keyof typeof LIEU_ETABLISSEMENT_SANTE_PRECISION;

export const lieuEtablissementSantePrecisionLabels: Record<LieuEtablissementSantePrecision, string> = {
  CH: 'CH',
  CHU: 'CHU',
  CABINET_MEDICAL: 'Cabinet médical ou dentaire, laboratoire, centre de radiologie, ...',
  CLINIQUE: 'Clinique',
  CLCC: 'CLCC (Centre de lutte contre le cancer)',
  SSR_SMR: 'SSR/SMR',
  USLD: 'USLD',
  BAPU: "BAPU (Bureaux d'aide psychologique universitaires)",
  CMP: 'CMP (Centres médico-psychologiques)',
  AUTRE: 'Autre',
};

// Etablissements pour personnes âgées - Précisions
export const LIEU_ETABLISSEMENT_PERSONNES_AGEES_PRECISION = {
  EHPAD: 'EHPAD',
  PASA: 'PASA',
  ACCUEIL_JOUR: 'ACCUEIL_JOUR',
  PUV: 'PUV',
  RA: 'RA',
  UHR: 'UHR',
  AUTRE: 'AUTRE',
} as const;

export type LieuEtablissementPersonnesAgeesPrecision = keyof typeof LIEU_ETABLISSEMENT_PERSONNES_AGEES_PRECISION;

export const lieuEtablissementPersonnesAgeesPrecisionLabels: Record<LieuEtablissementPersonnesAgeesPrecision, string> =
  {
    EHPAD: 'EHPAD',
    PASA: "PASA (Pôles d'activité et soins adaptés)",
    ACCUEIL_JOUR: 'Accueil de jour',
    PUV: 'PUV (Petite unité de vie)',
    RA: 'RA (résidence autonomie)',
    UHR: "UHR (Unité d'Hébergement Renforcé)",
    AUTRE: 'Autre',
  };

// Etablissements pour personnes handicapées - Précisions
export const LIEU_ETABLISSEMENT_HANDICAP_PRECISION = {
  MAS: 'MAS',
  EAM: 'EAM',
  EANM: 'EANM',
  IEM: 'IEM',
  EEAP: 'EEAP',
  IDA: 'IDA',
  IDV: 'IDV',
  CAMSP: 'CAMSP',
  ESAT: 'ESAT',
  CPO: 'CPO',
  CERFP: 'CERFP',
  IME: 'IME',
  ITEP: 'ITEP',
  ACCUEIL_JOUR: 'ACCUEIL_JOUR',
  AUTRE: 'AUTRE',
} as const;

export type LieuEtablissementHandicapPrecision = keyof typeof LIEU_ETABLISSEMENT_HANDICAP_PRECISION;

export const lieuEtablissementHandicapPrecisionLabels: Record<LieuEtablissementHandicapPrecision, string> = {
  MAS: "MAS (Maison d'accueil spécialisée)",
  EAM: "EAM (Foyer d'acceuil médicalisés)",
  EANM: 'EANM',
  IEM: "IEM (Instituts d'éducation motrice)",
  EEAP: 'EEAP (Etablissements pour enfants ou adolescents polyhandicapés)',
  IDA: 'IDA (instituts pour déficients auditifs)',
  IDV: 'IDV (instituts our déficients visuels)',
  CAMSP: "CAMSP (Centre d'action médico-sociale précoce)",
  ESAT: "ESAT (Etablissement et services d'aide par le travail)",
  CPO: 'CPO (Centres de pré orientation pour handicapés)',
  CERFP: "CERFP (Centre d'éducation de rééducation et de formation professionnel)",
  IME: 'IME (Instituts médicoéducatifs)',
  ITEP: 'ITEP (Instituts thérapeutiques, éducatifs et pédagogiques)',
  ACCUEIL_JOUR: 'Accueil de jour',
  AUTRE: 'Autre',
};

// Etablissements sociaux - Précisions
export const LIEU_ETABLISSEMENT_SOCIAL_PRECISION = {
  CAARUD: 'CAARUD',
  CPFSE: 'CPFSE',
  CADA: 'CADA',
  CENTRE_MATERNEL: 'CENTRE_MATERNEL',
  VILLAGES_ENFANTS: 'VILLAGES_ENFANTS',
  FOYERS_ENFANCE: 'FOYERS_ENFANCE',
  MECS: 'MECS',
  POUPONNIERE: 'POUPONNIERE',
  CHRS: 'CHRS',
  CHU: 'CHU',
  CHS: 'CHS',
  RESIDENCES_SOCIALES: 'RESIDENCES_SOCIALES',
  CPH: 'CPH',
  AUTRE: 'AUTRE',
} as const;

export type LieuEtablissementSocialPrecision = keyof typeof LIEU_ETABLISSEMENT_SOCIAL_PRECISION;

export const lieuEtablissementSocialPrecisionLabels: Record<LieuEtablissementSocialPrecision, string> = {
  CAARUD: 'CAARUD',
  CPFSE: 'CPFSE (centres de placement familial socioéducatif)',
  CADA: "CADA (Centre d'accueil pour demandeurs d'asile)",
  CENTRE_MATERNEL: "CENTRE MATERNEL (Etablissement d'accueil mère-enfant)",
  VILLAGES_ENFANTS: "Villages d'enfants",
  FOYERS_ENFANCE: "Foyers de l'enfance",
  MECS: "MECS (Maisons d'enfants à caractère social)",
  POUPONNIERE: 'Pouponnière à caractère social',
  CHRS: "CHRS (Centre d'hébergement et de réinsertion)",
  CHU: "CHU (Centre d'hébergement d'urgence)",
  CHS: "CHS (Centre d'hébergement de stabilisation)",
  RESIDENCES_SOCIALES: 'Résidences sociales (dont pensions de familles ou maisons relais et résidences accueil)',
  CPH: "CPH (Centres provisoires d'hébergement)",
  AUTRE: 'Autre',
};

// Autres établissements - Précisions
export const LIEU_AUTRES_ETABLISSEMENTS_PRECISION = {
  SALON_TATOUAGE_ESTHETIQUE: 'SALON_TATOUAGE_ESTHETIQUE',
  AUTRE: 'AUTRE',
} as const;

export type LieuAutresEtablissementsPrecision = keyof typeof LIEU_AUTRES_ETABLISSEMENTS_PRECISION;

export const lieuAutresEtablissementsPrecisionLabels: Record<LieuAutresEtablissementsPrecision, string> = {
  SALON_TATOUAGE_ESTHETIQUE: "Salon de tatouage, salon d'esthétique",
  AUTRE: 'Autre',
};

// Trajet - Précisions
export const LIEU_TRAJET_PRECISION = {
  BSPP: 'BSPP',
  ASSU: 'ASSU',
  VSAV: 'VSAV',
  AMBULANCE: 'AMBULANCE',
  VSL: 'VSL',
  TAXI: 'TAXI',
  AUTRE: 'AUTRE',
} as const;

export type LieuTrajetPrecision = keyof typeof LIEU_TRAJET_PRECISION;

export const lieuTrajetPrecisionLabels: Record<LieuTrajetPrecision, string> = {
  BSPP: 'Sapeurs Pompiers',
  ASSU: 'ASSU',
  VSAV: 'VSAV',
  AMBULANCE: 'Ambulance',
  VSL: 'Véhicule sanitaire léger',
  TAXI: 'Taxi',
  AUTRE: 'Autre',
};

export const PROFESSION_DOMICILE_TYPE = {
  SESSAD: 'SESSAD',
  PROF_LIBERAL: 'PROF_LIBERAL',
  HAD: 'HAD',
  SSAD: 'SSAD',
  SPST: 'SPST',
  SAMSAH: 'SAMSAH',
  AIDE_MENAGERE: 'AIDE_MENAGERE',
  REPAS: 'REPAS',
  TRAITEMENT: 'TRAITEMENT',
  SAADF: 'SAADF',
  MJPM: 'MJPM',
  SSIAD: 'SSIAD',
  SAED: 'SAED',
  SAEMO: 'SAEMO',
  SAAD: 'SAAD',
  AUTRE: 'AUTRE',
} as const;

export type ProfessionDomicileType = keyof typeof PROFESSION_DOMICILE_TYPE;

export const professionDomicileTypeLabels: Record<ProfessionDomicileType, string> = {
  PROF_LIBERAL: "Intervention d'un professionnel libéral ou service (SAMU, médecin)",
  HAD: 'Hospitalisation à domicile',
  SSAD: "Services de soins infirmiers ou d'aide à domicile (SAAD, SSIAD, SPASAD)",
  SAMSAH: 'SAMSAH',
  SAEMO: "SAEMO (services d'action éducative en milieu ouvert)",
  SESSAD: "Service d'éducation spéciale et de soins",
  SAED: "SAED (Services d'action éducative à domicile)",
  SPST: 'SPST',
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
  POMPIER: 'POMPIER',
  ASSU: 'ASSU',
  VSAV: 'VSAV',
  AMBULANCE: 'AMBULANCE',
  VSL: 'VSL',
  TAXI: 'TAXI',
  AUTRE: 'AUTRE',
} as const;

export type TransportType = keyof typeof TRANSPORT_TYPE;

export const transportTypeLabels: Record<TransportType, string> = {
  POMPIER: 'Sapeurs pompiers',
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

// Professionnel de santé - Précisions
export const PROFESSION_SANTE_PRECISION = {
  MEDECIN_GENERALISTE: 'MEDECIN_GENERALISTE',
  MEDECIN_SPECIALISTE: 'MEDECIN_SPECIALISTE',
  MEDEC: 'MEDEC',
  IDEC: 'IDEC',
  IBODE: 'IBODE',
  INFIRMIER: 'INFIRMIER',
  SAGE_FEMME: 'SAGE_FEMME',
  CADRE_SANTE: 'CADRE_SANTE',
  PHARMACIEN: 'PHARMACIEN',
  AIDE_SOIGNANT: 'AIDE_SOIGNANT',
  ASH: 'ASH',
  BIOLOGISTE: 'BIOLOGISTE',
  AMBULANCIER: 'AMBULANCIER',
  BRANCARDIER: 'BRANCARDIER',
  AUTRE: 'AUTRE',
} as const;

export type ProfessionSantePrecision = keyof typeof PROFESSION_SANTE_PRECISION;

export const professionSantePrecisionLabels: Record<ProfessionSantePrecision, string> = {
  MEDECIN_GENERALISTE: 'Médecin généraliste',
  MEDECIN_SPECIALISTE: 'Médecin spécialiste (cardio, uro, ...)',
  MEDEC: 'MEDEC',
  IDEC: 'IDEC',
  IBODE: 'IBODE',
  INFIRMIER: 'Infirmier',
  SAGE_FEMME: 'Sage-femme',
  CADRE_SANTE: 'Cadre de santé',
  PHARMACIEN: 'Pharmacien',
  AIDE_SOIGNANT: 'Aide soignant AS, AMP AES',
  ASH: 'Agent de services hospitaliers ASH',
  BIOLOGISTE: 'Biologiste',
  AMBULANCIER: 'Ambulancier',
  BRANCARDIER: 'Brancardier',
  AUTRE: 'Autre',
};

// Professionnel social - Précisions
export const PROFESSION_SOCIAL_PRECISION = {
  ASSISTANT_SOCIAL: 'ASSISTANT_SOCIAL',
  INTERVENANT_SOCIAL: 'INTERVENANT_SOCIAL',
  EDUCATEUR_SPECIALISE: 'EDUCATEUR_SPECIALISE',
  ANIMATEUR: 'ANIMATEUR',
  CESF: 'CESF',
  MANDATAIRE: 'MANDATAIRE',
  AUTRE: 'AUTRE',
} as const;

export type ProfessionSocialPrecision = keyof typeof PROFESSION_SOCIAL_PRECISION;

export const professionSocialPrecisionLabels: Record<ProfessionSocialPrecision, string> = {
  ASSISTANT_SOCIAL: 'Assistant social',
  INTERVENANT_SOCIAL: 'Intervenant social',
  EDUCATEUR_SPECIALISE: 'Educateur spécialisé',
  ANIMATEUR: 'Animateur',
  CESF: 'Conseillers en économie sociale et familial (CESF)',
  MANDATAIRE: 'Mandataire',
  AUTRE: 'Autre',
};

// Autre professionnel - Précisions
export const AUTRE_PROFESSIONNEL_PRECISION = {
  RESPONSABLE_ETABLISSEMENT: 'RESPONSABLE_ETABLISSEMENT',
  AGENT_ACCUEIL_ADMIN: 'AGENT_ACCUEIL_ADMIN',
  CHEF_SERVICE: 'CHEF_SERVICE',
  TATOUEUR: 'TATOUEUR',
  PSYCHANALYSTE: 'PSYCHANALYSTE',
  PSYCHOLOGUE: 'PSYCHOLOGUE',
  PSYCHOTHERAPEUTE: 'PSYCHOTHERAPEUTE',
  DIETETICIEN: 'DIETETICIEN',
  OSTEOPATHE: 'OSTEOPATHE',
  CHIROPRACTEUR: 'CHIROPRACTEUR',
  ORTHOPHONISTE: 'ORTHOPHONISTE',
  AUDIOPROTHESISTE: 'AUDIOPROTHESISTE',
  EPITHESISTE: 'EPITHESISTE',
  MANIPULATEUR_RADIO: 'MANIPULATEUR_RADIO',
  OCULAIRE_OPTIQUE: 'OCULAIRE_OPTIQUE',
  ORTHOPEDISTE: 'ORTHOPEDISTE',
  ORTHESISTE: 'ORTHESISTE',
  PSYCHOMOTRICIEN: 'PSYCHOMOTRICIEN',
  TECHNICIEN_LABO: 'TECHNICIEN_LABO',
  ACUPUNCTEUR: 'ACUPUNCTEUR',
  EQUIPE_MOBILE: 'EQUIPE_MOBILE',
  SAPEUR_POMPIER: 'SAPEUR_POMPIER',
  MEDECINE_NON_CONVENTIONNELLE: 'MEDECINE_NON_CONVENTIONNELLE',
  ESTHETICIEN: 'ESTHETICIEN',
  AUTRE: 'AUTRE',
} as const;

export type AutreProfessionnelPrecision = keyof typeof AUTRE_PROFESSIONNEL_PRECISION;

export const autreProfessionnelPrecisionLabels: Record<AutreProfessionnelPrecision, string> = {
  RESPONSABLE_ETABLISSEMENT: "Responsable d'établissement",
  AGENT_ACCUEIL_ADMIN: "Agent d'accueil ou administratif",
  CHEF_SERVICE: 'Chef de service',
  TATOUEUR: 'Tatoueur',
  PSYCHANALYSTE: 'Psychanalyste',
  PSYCHOLOGUE: 'Psychologue',
  PSYCHOTHERAPEUTE: 'Psychothérapeute',
  DIETETICIEN: 'Diététicien',
  OSTEOPATHE: 'Ostéopathe',
  CHIROPRACTEUR: 'Chiropracteur',
  ORTHOPHONISTE: 'Orthophoniste',
  AUDIOPROTHESISTE: 'Audioprothesiste',
  EPITHESISTE: 'Epithesiste',
  MANIPULATEUR_RADIO: 'Manipulateur radio',
  OCULAIRE_OPTIQUE: 'Oculariste, opticien, lunetier, orthoptiste',
  ORTHOPEDISTE: 'Orthopediste',
  ORTHESISTE: 'Orthesiste, orthoprothesistes, podo-orthésistes',
  PSYCHOMOTRICIEN: 'Psychomotricien',
  TECHNICIEN_LABO: 'Techniciens de laboratoire',
  ACUPUNCTEUR: 'Acupuncteur',
  EQUIPE_MOBILE: 'Équipe mobile',
  SAPEUR_POMPIER: 'Sapeur pompier',
  MEDECINE_NON_CONVENTIONNELLE: 'Médecine non conventionnelle (naturopathe...)',
  ESTHETICIEN: 'Esthéticien',
  AUTRE: 'Autre',
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
  AUTRE: 'AUTRE',
} as const;

export type DemarchesEngagees = keyof typeof DEMARCHES_ENGAGEES;

export const demarcheEngageeLabels: Record<DemarchesEngagees, string> = {
  CONTACT_RESPONSABLES: "L'établissement ou le responsables des faits a été contacté",
  CONTACT_ORGANISME: "Démarches engagées auprès d'autres organismes",
  PLAINTE: 'Une plainte a été déposée auprès des autorités judiciaires',
  AUTRE: 'Autre',
};

// Motifs principaux
export const MOTIF_PRINCIPAL = {
  ACTIVITES_D_ESTHETIQUE_NON_REGLEMENTEES: 'ACTIVITES_D_ESTHETIQUE_NON_REGLEMENTEES',
  MEDICAMENTS: 'MEDICAMENTS',
  FACTURATIONS_ET_HONORAIRES: 'FACTURATIONS_ET_HONORAIRES',
  HOTELLERIE_LOCAUX_RESTAURATION: 'HOTELLERIE_LOCAUX_RESTAURATION',
  INFORMATIONS_ET_DROITS_DES_USAGERS: 'INFORMATIONS_ET_DROITS_DES_USAGERS',
  MALTRAITANCE_PROFESSIONNELS_OU_ENTOURAGE: 'MALTRAITANCE_PROFESSIONNELS_OU_ENTOURAGE',
  MAUVAISE_ATTITUDE_DES_PROFESSIONNELS: 'MAUVAISE_ATTITUDE_DES_PROFESSIONNELS',
  PRATIQUE_NON_CONVENTIONNELLE: 'PRATIQUE_NON_CONVENTIONNELLE',
  PROBLEMES_D_ORGANISATION_OU_DE_RESSOURCES_HUMAINES: 'PROBLEMES_D_ORGANISATION_OU_DE_RESSOURCES_HUMAINES',
  QUALITE_DE_L_ACCOMPAGNEMENT_OU_DU_SERVICE: 'QUALITE_DE_L_ACCOMPAGNEMENT_OU_DU_SERVICE',
  QUALITE_DES_SOINS: 'QUALITE_DES_SOINS',
  DIFFICULTE_DE_RECHERCHE_D_ETABLISSEMENT_OU_D_UN_PROFESSIONNEL_OU_DE_SERVICE:
    'DIFFICULTE_DE_RECHERCHE_D_ETABLISSEMENT_OU_D_UN_PROFESSIONNEL_OU_DE_SERVICE',
  PROBLEMES_ENVIRONNEMENTAUX: 'PROBLEMES_ENVIRONNEMENTAUX',
  PROBLEMES_LIES_AU_TRANSPORT_SANITAIRE: 'PROBLEMES_LIES_AU_TRANSPORT_SANITAIRE',
} as const;

export type MotifPrincipal = keyof typeof MOTIF_PRINCIPAL;

export const motifPrincipalLabels: Record<MotifPrincipal, string> = {
  ACTIVITES_D_ESTHETIQUE_NON_REGLEMENTEES: "Activités d'esthétique  non réglementées",
  MEDICAMENTS: 'Médicaments',
  FACTURATIONS_ET_HONORAIRES: 'Facturations et honoraires',
  HOTELLERIE_LOCAUX_RESTAURATION: 'Hôtellerie locaux restauration',
  INFORMATIONS_ET_DROITS_DES_USAGERS: 'Informations et droits des usagers',
  MALTRAITANCE_PROFESSIONNELS_OU_ENTOURAGE: 'Maltraitance professionnels ou entourage',
  MAUVAISE_ATTITUDE_DES_PROFESSIONNELS: 'Mauvaise attitude des professionnels',
  PRATIQUE_NON_CONVENTIONNELLE: 'Pratique non conventionnelle',
  PROBLEMES_D_ORGANISATION_OU_DE_RESSOURCES_HUMAINES: "Problèmes d'organisation ou de ressources humaines",
  QUALITE_DE_L_ACCOMPAGNEMENT_OU_DU_SERVICE: "Qualité de l'accompagnement ou du service",
  QUALITE_DES_SOINS: 'Qualité des soins',
  DIFFICULTE_DE_RECHERCHE_D_ETABLISSEMENT_OU_D_UN_PROFESSIONNEL_OU_DE_SERVICE:
    "Difficulté de recherche d'établissement ou d'un professionnel ou de service",
  PROBLEMES_ENVIRONNEMENTAUX: 'Problèmes environnementaux',
  PROBLEMES_LIES_AU_TRANSPORT_SANITAIRE: 'Problèmes liés au transport Sanitaire',
};

// Sous-motifs pour: Activités d\'esthétique  non réglementées
export const SOUS_MOTIF_ACTIVITES_D_ESTHETIQUE_NON_REGLEMENTEES = {
  AUTRES: 'AUTRES',
  DEFAUT_DE_DECLARATION_D_ACTIVITE: 'DEFAUT_DE_DECLARATION_D_ACTIVITE',
  NON_RESPECT_DES_REGLES_HYGIENE_CONFORMITE_DES_LOCAUX_CONSENTEMENT_ECLAIRE_TARIFS_PRATIQUES_FORMATIONS:
    'NON_RESPECT_DES_REGLES_HYGIENE_CONFORMITE_DES_LOCAUX_CONSENTEMENT_ECLAIRE_TARIFS_PRATIQUES_FORMATIONS',
} as const;

export type SousMotifACTIVITES_D_ESTHETIQUE_NON_REGLEMENTEES =
  keyof typeof SOUS_MOTIF_ACTIVITES_D_ESTHETIQUE_NON_REGLEMENTEES;

export const sousMotifACTIVITES_D_ESTHETIQUE_NON_REGLEMENTEESLabels: Record<
  SousMotifACTIVITES_D_ESTHETIQUE_NON_REGLEMENTEES,
  string
> = {
  AUTRES: 'Autres',
  DEFAUT_DE_DECLARATION_D_ACTIVITE: "Défaut de déclaration d'activité",
  NON_RESPECT_DES_REGLES_HYGIENE_CONFORMITE_DES_LOCAUX_CONSENTEMENT_ECLAIRE_TARIFS_PRATIQUES_FORMATIONS:
    'Non respect des règles (hygiène, conformité des locaux, consentement éclairé, tarifs pratiqués, formations…)',
};

// Sous-motifs pour: Médicaments
export const SOUS_MOTIF_MEDICAMENTS = {
  PROBLEMATIQUE_DE_CIRCUIT_DU_MEDICAMENT: 'PROBLEMATIQUE_DE_CIRCUIT_DU_MEDICAMENT',
  STOCKAGE_DES_MEDICAMENTS: 'STOCKAGE_DES_MEDICAMENTS',
  VENTE_DE_MEDICAMENTS_SUR_INTERNET: 'VENTE_DE_MEDICAMENTS_SUR_INTERNET',
} as const;

export type SousMotifMEDICAMENTS = keyof typeof SOUS_MOTIF_MEDICAMENTS;

export const sousMotifMEDICAMENTSLabels: Record<SousMotifMEDICAMENTS, string> = {
  PROBLEMATIQUE_DE_CIRCUIT_DU_MEDICAMENT: 'Problématique de circuit du médicament',
  STOCKAGE_DES_MEDICAMENTS: 'Stockage des médicaments',
  VENTE_DE_MEDICAMENTS_SUR_INTERNET: 'Vente de médicaments sur internet',
};

// Sous-motifs pour: Facturations et honoraires
export const SOUS_MOTIF_FACTURATIONS_ET_HONORAIRES = {
  AUTRES: 'AUTRES',
  PROBLEME_D_HONORAIRES: 'PROBLEME_D_HONORAIRES',
  PROBLEME_DE_FACTURATION: 'PROBLEME_DE_FACTURATION',
  HONORAIRES_PROFESSIONS_LIBERALES: 'HONORAIRES_PROFESSIONS_LIBERALES',
} as const;

export type SousMotifFACTURATIONS_ET_HONORAIRES = keyof typeof SOUS_MOTIF_FACTURATIONS_ET_HONORAIRES;

export const sousMotifFACTURATIONS_ET_HONORAIRESLabels: Record<SousMotifFACTURATIONS_ET_HONORAIRES, string> = {
  AUTRES: 'Autres',
  PROBLEME_D_HONORAIRES: "Problème d'honoraires",
  PROBLEME_DE_FACTURATION: 'Problème de facturation',
  HONORAIRES_PROFESSIONS_LIBERALES: 'Honoraires professions libérales',
};

// Sous-motifs pour: Hôtellerie locaux restauration
export const SOUS_MOTIF_HOTELLERIE_LOCAUX_RESTAURATION = {
  ACCESSIBILITE_DES_LOCAUX_AUX_PERSONNES_A_MOBILITE_REDUITE_PARKING:
    'ACCESSIBILITE_DES_LOCAUX_AUX_PERSONNES_A_MOBILITE_REDUITE_PARKING',
  ACCUEIL: 'ACCUEIL',
  ADMISSION: 'ADMISSION',
  AUTRES: 'AUTRES',
  CONFIGURATION_DES_LOCAUX_EQUIPEMENT_SANITAIRE_SUPERFICIE_CHAMBRE_EQUIPEMENTS_DIVERS:
    'CONFIGURATION_DES_LOCAUX_EQUIPEMENT_SANITAIRE_SUPERFICIE_CHAMBRE_EQUIPEMENTS_DIVERS',
  ENTRETIEN_FENETRE_ENDOMMAGE_DIGICODE_NON_FONCTIONNEL: 'ENTRETIEN_FENETRE_ENDOMMAGE_DIGICODE_NON_FONCTIONNEL',
  HYGIENE_ENTRETIEN_MENAGE: 'HYGIENE_ENTRETIEN_MENAGE',
  LA_GESTION_DES_RESSOURCES_OU_DES_BIENS_DE_LA_PERSONNE_DEPOT_VOLS_PERTE:
    'LA_GESTION_DES_RESSOURCES_OU_DES_BIENS_DE_LA_PERSONNE_DEPOT_VOLS_PERTE',
  LES_EQUIPEMENTS_A_USAGE_PERSONNEL_TELEVISION: 'LES_EQUIPEMENTS_A_USAGE_PERSONNEL_TELEVISION',
  ABSENCE_DE_LIEU_D_ACCUEIL_POUR_LA_FAMILLE: 'ABSENCE_DE_LIEU_D_ACCUEIL_POUR_LA_FAMILLE',
  SECURITE_DES_LOCAUX_LOCAUX_MAL_SECURISE: 'SECURITE_DES_LOCAUX_LOCAUX_MAL_SECURISE',
  SECURITE_DES_PERSONNES_CHUTE: 'SECURITE_DES_PERSONNES_CHUTE',
  SERVICE_DE_RESTAURATION_HORAIRES_DES_REPAS_QUANTITE_SERVIE_QUALITE_DES_REPAS:
    'SERVICE_DE_RESTAURATION_HORAIRES_DES_REPAS_QUANTITE_SERVIE_QUALITE_DES_REPAS',
} as const;

export type SousMotifHOTELLERIE_LOCAUX_RESTAURATION = keyof typeof SOUS_MOTIF_HOTELLERIE_LOCAUX_RESTAURATION;

export const sousMotifHOTELLERIE_LOCAUX_RESTAURATIONLabels: Record<SousMotifHOTELLERIE_LOCAUX_RESTAURATION, string> = {
  ACCESSIBILITE_DES_LOCAUX_AUX_PERSONNES_A_MOBILITE_REDUITE_PARKING:
    'Accessibilité des locaux (aux personnes à mobilité réduite, parking…)',
  ACCUEIL: 'Accueil',
  ADMISSION: 'Admission',
  AUTRES: 'Autres',
  CONFIGURATION_DES_LOCAUX_EQUIPEMENT_SANITAIRE_SUPERFICIE_CHAMBRE_EQUIPEMENTS_DIVERS:
    'Configuration des locaux (équipement sanitaire, superficie chambre, équipements divers)',
  ENTRETIEN_FENETRE_ENDOMMAGE_DIGICODE_NON_FONCTIONNEL: 'Entretien (fenêtre endommagé, digicode non fonctionnel, …)',
  HYGIENE_ENTRETIEN_MENAGE: 'Hygiène (entretien, ménage…)',
  LA_GESTION_DES_RESSOURCES_OU_DES_BIENS_DE_LA_PERSONNE_DEPOT_VOLS_PERTE:
    'La gestion des ressources ou des biens de la personne (dépôt, vols, perte…)',
  LES_EQUIPEMENTS_A_USAGE_PERSONNEL_TELEVISION: 'Les équipements à usage personnel (télévision…)',
  ABSENCE_DE_LIEU_D_ACCUEIL_POUR_LA_FAMILLE: "Absence de lieu d'accueil pour la famille",
  SECURITE_DES_LOCAUX_LOCAUX_MAL_SECURISE: 'Sécurité des locaux (locaux mal sécurisé)',
  SECURITE_DES_PERSONNES_CHUTE: 'Sécurité des personnes (chute...)',
  SERVICE_DE_RESTAURATION_HORAIRES_DES_REPAS_QUANTITE_SERVIE_QUALITE_DES_REPAS:
    'Service de restauration (horaires des repas, quantité servie, qualité des repas…)',
};

// Sous-motifs pour: Informations et droits des usagers
export const SOUS_MOTIF_INFORMATIONS_ET_DROITS_DES_USAGERS = {
  INFORMATIONS_SUR_L_ACCOMPAGNEMENT_A_LA_FIN_DE_VIE_LOI_LEONETTI_DEMANDE_EVOLUTIONS_LEGISLATION:
    'INFORMATIONS_SUR_L_ACCOMPAGNEMENT_A_LA_FIN_DE_VIE_LOI_LEONETTI_DEMANDE_EVOLUTIONS_LEGISLATION',
  AUTRES: 'AUTRES',
  DOSSIER_MEDICAL_NON_COMMUNIQUE: 'DOSSIER_MEDICAL_NON_COMMUNIQUE',
  INFORMATIONS_SUR_LA_DESIGNATION_D_UNE_PERSONNE_DE_CONFIANCE:
    'INFORMATIONS_SUR_LA_DESIGNATION_D_UNE_PERSONNE_DE_CONFIANCE',
  INFORMATIONS_DU_PATIENT_ET_RESIDENT_SUITE_A_UN_EVENEMENT_INDESIRABLE:
    'INFORMATIONS_DU_PATIENT_ET_RESIDENT_SUITE_A_UN_EVENEMENT_INDESIRABLE',
  INFORMATIONS_DU_PATIENT_SUR_SA_PATHOLOGIE_SON_OPERATION_LES_RISQUES_ENCOURUS:
    'INFORMATIONS_DU_PATIENT_SUR_SA_PATHOLOGIE_SON_OPERATION_LES_RISQUES_ENCOURUS',
  MODALITES_D_ANNONCE_D_UN_DECES: 'MODALITES_D_ANNONCE_D_UN_DECES',
  RECUEIL_DU_CONSENTEMENT: 'RECUEIL_DU_CONSENTEMENT',
  NON_RESPECT_DU_SECRET_MEDICAL: 'NON_RESPECT_DU_SECRET_MEDICAL',
} as const;

export type SousMotifINFORMATIONS_ET_DROITS_DES_USAGERS = keyof typeof SOUS_MOTIF_INFORMATIONS_ET_DROITS_DES_USAGERS;

export const sousMotifINFORMATIONS_ET_DROITS_DES_USAGERSLabels: Record<
  SousMotifINFORMATIONS_ET_DROITS_DES_USAGERS,
  string
> = {
  INFORMATIONS_SUR_L_ACCOMPAGNEMENT_A_LA_FIN_DE_VIE_LOI_LEONETTI_DEMANDE_EVOLUTIONS_LEGISLATION:
    "Informations sur l'accompagnement à la fin de vie (Loi Léonetti, demande évolutions législation)",
  AUTRES: 'Autres',
  DOSSIER_MEDICAL_NON_COMMUNIQUE: 'Dossier médical non communiqué',
  INFORMATIONS_SUR_LA_DESIGNATION_D_UNE_PERSONNE_DE_CONFIANCE:
    "Informations sur la désignation d'une personne de confiance",
  INFORMATIONS_DU_PATIENT_ET_RESIDENT_SUITE_A_UN_EVENEMENT_INDESIRABLE:
    'Informations du patient et résident suite à un événement (indésirable)',
  INFORMATIONS_DU_PATIENT_SUR_SA_PATHOLOGIE_SON_OPERATION_LES_RISQUES_ENCOURUS:
    'Informations du patient sur sa pathologie, son opération, les risques encourus',
  MODALITES_D_ANNONCE_D_UN_DECES: "Modalités d'annonce d'un décès",
  RECUEIL_DU_CONSENTEMENT: 'Recueil du consentement',
  NON_RESPECT_DU_SECRET_MEDICAL: 'Non-respect du secret médical',
};

// Sous-motifs pour: Maltraitance professionnels ou entourage
export const SOUS_MOTIF_MALTRAITANCE_PROFESSIONNELS_OU_ENTOURAGE = {
  DISCRIMINATIONS: 'DISCRIMINATIONS',
  EXPOSITION_A_UN_ENVIRONNEMENT_VIOLENT: 'EXPOSITION_A_UN_ENVIRONNEMENT_VIOLENT',
  NEGLIGENCES_ACTIVES: 'NEGLIGENCES_ACTIVES',
  NEGLIGENCES_PASSIVES: 'NEGLIGENCES_PASSIVES',
  PRIVATION_DE_SOIN_NOTAMMENT_DES_BESOINS_FONDAMENTAUX: 'PRIVATION_DE_SOIN_NOTAMMENT_DES_BESOINS_FONDAMENTAUX',
  PRIVATION_OU_VIOLATION_DE_DROITS_DES_LIBERTES: 'PRIVATION_OU_VIOLATION_DE_DROITS_DES_LIBERTES',
  VIOLENCES_MATERIELLES_ET_FINANCIERES: 'VIOLENCES_MATERIELLES_ET_FINANCIERES',
  VIOLENCES_MEDICALES_OU_MEDICAMENTEUSES: 'VIOLENCES_MEDICALES_OU_MEDICAMENTEUSES',
  VIOLENCES_PHYSIQUES: 'VIOLENCES_PHYSIQUES',
  VIOLENCES_PSYCHIQUES_OU_MORALES: 'VIOLENCES_PSYCHIQUES_OU_MORALES',
  VIOLENCES_SEXUELLES: 'VIOLENCES_SEXUELLES',
} as const;

export type SousMotifMALTRAITANCE_PROFESSIONNELS_OU_ENTOURAGE =
  keyof typeof SOUS_MOTIF_MALTRAITANCE_PROFESSIONNELS_OU_ENTOURAGE;

export const sousMotifMALTRAITANCE_PROFESSIONNELS_OU_ENTOURAGELabels: Record<
  SousMotifMALTRAITANCE_PROFESSIONNELS_OU_ENTOURAGE,
  string
> = {
  DISCRIMINATIONS: 'Discriminations',
  EXPOSITION_A_UN_ENVIRONNEMENT_VIOLENT: 'Exposition à un environnement violent',
  NEGLIGENCES_ACTIVES: 'Négligences actives',
  NEGLIGENCES_PASSIVES: 'Négligences passives',
  PRIVATION_DE_SOIN_NOTAMMENT_DES_BESOINS_FONDAMENTAUX: 'Privation de soin, notamment des besoins fondamentaux',
  PRIVATION_OU_VIOLATION_DE_DROITS_DES_LIBERTES: 'Privation ou violation de droits, des libertés',
  VIOLENCES_MATERIELLES_ET_FINANCIERES: 'Violences matérielles et financières',
  VIOLENCES_MEDICALES_OU_MEDICAMENTEUSES: 'Violences médicales ou médicamenteuses',
  VIOLENCES_PHYSIQUES: 'Violences physiques',
  VIOLENCES_PSYCHIQUES_OU_MORALES: 'Violences psychiques ou morales',
  VIOLENCES_SEXUELLES: 'Violences sexuelles',
};

// Sous-motifs pour: Mauvaise attitude des professionnels
export const SOUS_MOTIF_MAUVAISE_ATTITUDE_DES_PROFESSIONNELS = {
  AUTRES: 'AUTRES',
  DEFAUT_D_ENCADREMENT_EN_STAGE: 'DEFAUT_D_ENCADREMENT_EN_STAGE',
  REFUS_D_AIDE_DE_LA_PART_D_UN_PROFESSIONNEL: 'REFUS_D_AIDE_DE_LA_PART_D_UN_PROFESSIONNEL',
  RELATIONS_ENTRE_LA_FAMILLE_L_ENTOURAGE_ET_LES_PROFESSIONNELS:
    'RELATIONS_ENTRE_LA_FAMILLE_L_ENTOURAGE_ET_LES_PROFESSIONNELS',
  RELATIONS_ENTRE_L_USAGER_ET_LES_PROFESSIONNELS: 'RELATIONS_ENTRE_L_USAGER_ET_LES_PROFESSIONNELS',
  REFUS_DE_CONSULTATION_PAR_UN_PROFESSIONNEL_DE_SANTE_LIBERAL:
    'REFUS_DE_CONSULTATION_PAR_UN_PROFESSIONNEL_DE_SANTE_LIBERAL',
  REFUS_D_INTERVENTION_AU_DOMICILE_EXEMPLE_SOS_MEDECINS_IDEL:
    'REFUS_D_INTERVENTION_AU_DOMICILE_EXEMPLE_SOS_MEDECINS_IDEL',
} as const;

export type SousMotifMAUVAISE_ATTITUDE_DES_PROFESSIONNELS =
  keyof typeof SOUS_MOTIF_MAUVAISE_ATTITUDE_DES_PROFESSIONNELS;

export const sousMotifMAUVAISE_ATTITUDE_DES_PROFESSIONNELSLabels: Record<
  SousMotifMAUVAISE_ATTITUDE_DES_PROFESSIONNELS,
  string
> = {
  AUTRES: 'Autres',
  DEFAUT_D_ENCADREMENT_EN_STAGE: "Défaut d'encadrement en stage",
  REFUS_D_AIDE_DE_LA_PART_D_UN_PROFESSIONNEL: "Refus d'aide de la part d'un professionnel",
  RELATIONS_ENTRE_LA_FAMILLE_L_ENTOURAGE_ET_LES_PROFESSIONNELS:
    "Relations entre la famille/l'entourage et les professionnels",
  RELATIONS_ENTRE_L_USAGER_ET_LES_PROFESSIONNELS: "Relations entre l'usager et les professionnels",
  REFUS_DE_CONSULTATION_PAR_UN_PROFESSIONNEL_DE_SANTE_LIBERAL:
    'Refus de consultation par un professionnel de santé libéral ',
  REFUS_D_INTERVENTION_AU_DOMICILE_EXEMPLE_SOS_MEDECINS_IDEL:
    "Refus d'intervention au domicile (exemple : SOS médecins, IDEL ...)",
};

// Sous-motifs pour: Pratique non conventionnelle
export const SOUS_MOTIF_PRATIQUE_NON_CONVENTIONNELLE = {
  DERIVES_SECTAIRES: 'DERIVES_SECTAIRES',
  EXERCICE_ILLEGAL_USURPATION_DE_TITRE_MEDECINE_OU_AUTRE_PROFESSION:
    'EXERCICE_ILLEGAL_USURPATION_DE_TITRE_MEDECINE_OU_AUTRE_PROFESSION',
} as const;

export type SousMotifPRATIQUE_NON_CONVENTIONNELLE = keyof typeof SOUS_MOTIF_PRATIQUE_NON_CONVENTIONNELLE;

export const sousMotifPRATIQUE_NON_CONVENTIONNELLELabels: Record<SousMotifPRATIQUE_NON_CONVENTIONNELLE, string> = {
  DERIVES_SECTAIRES: 'Dérives sectaires',
  EXERCICE_ILLEGAL_USURPATION_DE_TITRE_MEDECINE_OU_AUTRE_PROFESSION:
    'Exercice illegal / usurpation de titre (médecine ou autre profession)',
};

// Sous-motifs pour: Problèmes d\'organisation ou de ressources humaines
export const SOUS_MOTIF_PROBLEMES_D_ORGANISATION_OU_DE_RESSOURCES_HUMAINES = {
  CONFLIT_AVEC_LA_DIRECTION_D_ETABLISSEMENT_OU_DE_SERVICE: 'CONFLIT_AVEC_LA_DIRECTION_D_ETABLISSEMENT_OU_DE_SERVICE',
  CONFLIT_SOCIAL: 'CONFLIT_SOCIAL',
  MANQUE_DE_PERSONNELS_ENCADRANT_DANS_LES_INSTITUTS_DE_FORMATION_PROFESSION_PARA_MEDICAL_ET_SOCIALE:
    'MANQUE_DE_PERSONNELS_ENCADRANT_DANS_LES_INSTITUTS_DE_FORMATION_PROFESSION_PARA_MEDICAL_ET_SOCIALE',
  MANQUE_DE_PERSONNEL_SOIGNANT: 'MANQUE_DE_PERSONNEL_SOIGNANT',
  ABSENCE_DE_MEDEC: 'ABSENCE_DE_MEDEC',
  MANQUE_DE_QUALIFICATION_DU_PERSONNEL_DIPLOME: 'MANQUE_DE_QUALIFICATION_DU_PERSONNEL_DIPLOME',
  MANQUE_DE_PERSONNEL_NON_SOIGNANT: 'MANQUE_DE_PERSONNEL_NON_SOIGNANT',
} as const;

export type SousMotifPROBLEMES_D_ORGANISATION_OU_DE_RESSOURCES_HUMAINES =
  keyof typeof SOUS_MOTIF_PROBLEMES_D_ORGANISATION_OU_DE_RESSOURCES_HUMAINES;

export const sousMotifPROBLEMES_D_ORGANISATION_OU_DE_RESSOURCES_HUMAINESLabels: Record<
  SousMotifPROBLEMES_D_ORGANISATION_OU_DE_RESSOURCES_HUMAINES,
  string
> = {
  CONFLIT_AVEC_LA_DIRECTION_D_ETABLISSEMENT_OU_DE_SERVICE: "Conflit avec la direction d'établissement ou de service",
  CONFLIT_SOCIAL: 'Conflit social',
  MANQUE_DE_PERSONNELS_ENCADRANT_DANS_LES_INSTITUTS_DE_FORMATION_PROFESSION_PARA_MEDICAL_ET_SOCIALE:
    'Manque de personnels encadrant dans les instituts de formation (profession para-médical et sociale)',
  MANQUE_DE_PERSONNEL_SOIGNANT: 'Manque de personnel soignant',
  ABSENCE_DE_MEDEC: 'Absence de MEDEC',
  MANQUE_DE_QUALIFICATION_DU_PERSONNEL_DIPLOME: 'Manque de qualification du personnel (diplôme...)',
  MANQUE_DE_PERSONNEL_NON_SOIGNANT: 'Manque de personnel non soignant',
};

// Sous-motifs pour: Qualité de l\'accompagnement ou du service
export const SOUS_MOTIF_QUALITE_DE_L_ACCOMPAGNEMENT_OU_DU_SERVICE = {
  PROBLEME_D_ACCOMPAGNEMENT_ET_OU_SUIVI_INDIVIDUEL_PROJET_DE_VIE_SUIVI_SOCIAL_EDUCATIF_ADMINISTRATIF:
    'PROBLEME_D_ACCOMPAGNEMENT_ET_OU_SUIVI_INDIVIDUEL_PROJET_DE_VIE_SUIVI_SOCIAL_EDUCATIF_ADMINISTRATIF',
  NON_RESPECT_DES_PROGRAMMES_DE_FORMATION: 'NON_RESPECT_DES_PROGRAMMES_DE_FORMATION',
  ABSENCE_D_ANIMATION: 'ABSENCE_D_ANIMATION',
  AUTRES: 'AUTRES',
  QUALITE_DES_ANIMATIONS_AU_LIEU_D_INTERVENTIONS: 'QUALITE_DES_ANIMATIONS_AU_LIEU_D_INTERVENTIONS',
  PROBLEMATIQUE_DE_FONCTIONNEMENT_DE_L_ESSMS_REGLEMENT_INTERIEUR:
    'PROBLEMATIQUE_DE_FONCTIONNEMENT_DE_L_ESSMS_REGLEMENT_INTERIEUR',
  VIOLENCES_ENTRE_USAGERS: 'VIOLENCES_ENTRE_USAGERS',
  VILOLENCES_D_UN_USAGER_ENVERS_SON_ENTOURAGE: 'VILOLENCES_D_UN_USAGER_ENVERS_SON_ENTOURAGE',
  VIOLENCES_D_UN_USAGER_ENVERS_UN_PROFESSIONNEL: 'VIOLENCES_D_UN_USAGER_ENVERS_UN_PROFESSIONNEL',
  DEFAUT_DE_SURVEILLANCE_FUGUE_DISPARITION_INQUIETANTE: 'DEFAUT_DE_SURVEILLANCE_FUGUE_DISPARITION_INQUIETANTE',
} as const;

export type SousMotifQUALITE_DE_L_ACCOMPAGNEMENT_OU_DU_SERVICE =
  keyof typeof SOUS_MOTIF_QUALITE_DE_L_ACCOMPAGNEMENT_OU_DU_SERVICE;

export const sousMotifQUALITE_DE_L_ACCOMPAGNEMENT_OU_DU_SERVICELabels: Record<
  SousMotifQUALITE_DE_L_ACCOMPAGNEMENT_OU_DU_SERVICE,
  string
> = {
  PROBLEME_D_ACCOMPAGNEMENT_ET_OU_SUIVI_INDIVIDUEL_PROJET_DE_VIE_SUIVI_SOCIAL_EDUCATIF_ADMINISTRATIF:
    "Problème d'accompagnement et/ou suivi individuel : projet de vie, suivi social, éducatif, administratif…",
  NON_RESPECT_DES_PROGRAMMES_DE_FORMATION: 'Non respect des programmes de formation',
  ABSENCE_D_ANIMATION: "Absence d'animation",
  AUTRES: 'Autres',
  QUALITE_DES_ANIMATIONS_AU_LIEU_D_INTERVENTIONS: "Qualité des animations au lieu d'interventions",
  PROBLEMATIQUE_DE_FONCTIONNEMENT_DE_L_ESSMS_REGLEMENT_INTERIEUR:
    "Problématique de fonctionnement de l'ESSMS (règlement intérieur, …)",
  VIOLENCES_ENTRE_USAGERS: 'Violences entre usagers',
  VILOLENCES_D_UN_USAGER_ENVERS_SON_ENTOURAGE: "Vilolences d'un usager envers son entourage",
  VIOLENCES_D_UN_USAGER_ENVERS_UN_PROFESSIONNEL: "Violences d'un usager envers un professionnel",
  DEFAUT_DE_SURVEILLANCE_FUGUE_DISPARITION_INQUIETANTE: 'Défaut de surveillance (fugue / disparition inquiétante)',
};

// Sous-motifs pour: Qualité des soins
export const SOUS_MOTIF_QUALITE_DES_SOINS = {
  ABSENCE_OU_INSUFFISANCE_DE_SOINS_MEDICAUX: 'ABSENCE_OU_INSUFFISANCE_DE_SOINS_MEDICAUX',
  ABSENCE_OU_INSUFFISANCE_DE_SOINS_PARAMEDICAUX_REPAS_HYGIENE:
    'ABSENCE_OU_INSUFFISANCE_DE_SOINS_PARAMEDICAUX_REPAS_HYGIENE',
  ABSENCE_OU_INSUFFISANCE_DE_LA_REEDUCATION: 'ABSENCE_OU_INSUFFISANCE_DE_LA_REEDUCATION',
  AFFECTIONS_IATROGENES_INFECTIONS_LIEES_AUX_SOINS_INFECTIONS_NOSOCOMIALES_EVENEMENTS_LIES_A_UN_PRODUIT_DE_SANTE:
    'AFFECTIONS_IATROGENES_INFECTIONS_LIEES_AUX_SOINS_INFECTIONS_NOSOCOMIALES_EVENEMENTS_LIES_A_UN_PRODUIT_DE_SANTE',
  AIDE_MEDICALE_URGENTE_SAMU: 'AIDE_MEDICALE_URGENTE_SAMU',
  AUTRES: 'AUTRES',
  DEFAILLANCE_OU_INCIDENT_LIE_AUX_SOINS_OU_A_LA_SURVEILLANCE_COMPLICATIONS_INCAPACITE_DECES:
    'DEFAILLANCE_OU_INCIDENT_LIE_AUX_SOINS_OU_A_LA_SURVEILLANCE_COMPLICATIONS_INCAPACITE_DECES',
  DELAIS_DE_PRISE_EN_CHARGE: 'DELAIS_DE_PRISE_EN_CHARGE',
  DIAGNOSTIC_PERTINENCE_DES_EXAMENS: 'DIAGNOSTIC_PERTINENCE_DES_EXAMENS',
  ETAT_DU_MATERIEL_EN_RAPPORT_AVEC_LES_SOINS: 'ETAT_DU_MATERIEL_EN_RAPPORT_AVEC_LES_SOINS',
  LES_CONDITIONS_DE_PRELEVEMENTS_BIOLOGIQUES: 'LES_CONDITIONS_DE_PRELEVEMENTS_BIOLOGIQUES',
  PRISE_EN_CHARGE_DE_LA_DOULEUR: 'PRISE_EN_CHARGE_DE_LA_DOULEUR',
  RESULTATS_D_EXAMENS: 'RESULTATS_D_EXAMENS',
  SOINS_PALLIATIFS_ABSENCE_OU_DEFAUT_DE_PLAN_DE_SOIN: 'SOINS_PALLIATIFS_ABSENCE_OU_DEFAUT_DE_PLAN_DE_SOIN',
  SOINS_POST_MORTEM_CONSERVATION_DU_CORPS: 'SOINS_POST_MORTEM_CONSERVATION_DU_CORPS',
} as const;

export type SousMotifQUALITE_DES_SOINS = keyof typeof SOUS_MOTIF_QUALITE_DES_SOINS;

export const sousMotifQUALITE_DES_SOINSLabels: Record<SousMotifQUALITE_DES_SOINS, string> = {
  ABSENCE_OU_INSUFFISANCE_DE_SOINS_MEDICAUX: 'Absence ou insuffisance de soins médicaux',
  ABSENCE_OU_INSUFFISANCE_DE_SOINS_PARAMEDICAUX_REPAS_HYGIENE:
    'Absence ou insuffisance de soins paramédicaux (repas, hygiène…)',
  ABSENCE_OU_INSUFFISANCE_DE_LA_REEDUCATION: 'Absence ou insuffisance de la rééducation',
  AFFECTIONS_IATROGENES_INFECTIONS_LIEES_AUX_SOINS_INFECTIONS_NOSOCOMIALES_EVENEMENTS_LIES_A_UN_PRODUIT_DE_SANTE:
    'Affections iatrogénes : infections liées aux soins, infections nosocomiales, événements liés à un produit de santé',
  AIDE_MEDICALE_URGENTE_SAMU: 'Aide médicale urgente (SAMU)',
  AUTRES: 'Autres',
  DEFAILLANCE_OU_INCIDENT_LIE_AUX_SOINS_OU_A_LA_SURVEILLANCE_COMPLICATIONS_INCAPACITE_DECES:
    'Défaillance ou incident lié aux soins ou à la surveillance (complications, incapacité, décès)',
  DELAIS_DE_PRISE_EN_CHARGE: 'Délais de prise en charge',
  DIAGNOSTIC_PERTINENCE_DES_EXAMENS: 'Diagnostic, pertinence des examens',
  ETAT_DU_MATERIEL_EN_RAPPORT_AVEC_LES_SOINS: 'Etat du matériel (en rapport avec les soins)',
  LES_CONDITIONS_DE_PRELEVEMENTS_BIOLOGIQUES: 'Les conditions de prélèvements biologiques',
  PRISE_EN_CHARGE_DE_LA_DOULEUR: 'Prise en charge de la douleur',
  RESULTATS_D_EXAMENS: "Résultats d'examens",
  SOINS_PALLIATIFS_ABSENCE_OU_DEFAUT_DE_PLAN_DE_SOIN: 'Soins palliatifs (absence ou défaut de plan de soin)',
  SOINS_POST_MORTEM_CONSERVATION_DU_CORPS: 'Soins post-mortem, conservation du corps',
};

// Sous-motifs pour: Difficulté de recherche d\'établissement ou d\'un professionnel ou de service
export const SOUS_MOTIF_DIFFICULTE_DE_RECHERCHE_D_ETABLISSEMENT_OU_D_UN_PROFESSIONNEL_OU_DE_SERVICE = {
  AUTRES: 'AUTRES',
  GARDE_ET_PERMANENCE_DES_SOINS_AMBULATOIRES: 'GARDE_ET_PERMANENCE_DES_SOINS_AMBULATOIRES',
  MEDECIN_TRAITANT: 'MEDECIN_TRAITANT',
  SPECIALISTE: 'SPECIALISTE',
  RECHERCHE_DE_SMR: 'RECHERCHE_DE_SMR',
  ETABLISSEMENT_MEDICO_SOCIAL_PA: 'ETABLISSEMENT_MEDICO_SOCIAL_PA',
  ETABLISSEMENT_MEDICO_SOCIAL_PH: 'ETABLISSEMENT_MEDICO_SOCIAL_PH',
  TRANSFERT_PAR_MANQUE_DE_LIT: 'TRANSFERT_PAR_MANQUE_DE_LIT',
  DELAIS_D_ATTENTE_POUR_UNE_PLACE_AU_SEIN_DE_L_ETABLISSEMENT:
    'DELAIS_D_ATTENTE_POUR_UNE_PLACE_AU_SEIN_DE_L_ETABLISSEMENT',
  RECHERCHE_D_UN_SERVICE_D_ACCOMPAGNEMENT_A_DOMICILE_PA: 'RECHERCHE_D_UN_SERVICE_D_ACCOMPAGNEMENT_A_DOMICILE_PA',
  RECHERCHE_D_UN_SERVICE_D_ACCOMPAGNEMENT_A_DOMICILE_PH: 'RECHERCHE_D_UN_SERVICE_D_ACCOMPAGNEMENT_A_DOMICILE_PH',
} as const;

export type SousMotifDIFFICULTE_DE_RECHERCHE_D_ETABLISSEMENT_OU_D_UN_PROFESSIONNEL_OU_DE_SERVICE =
  keyof typeof SOUS_MOTIF_DIFFICULTE_DE_RECHERCHE_D_ETABLISSEMENT_OU_D_UN_PROFESSIONNEL_OU_DE_SERVICE;

export const sousMotifDIFFICULTE_DE_RECHERCHE_D_ETABLISSEMENT_OU_D_UN_PROFESSIONNEL_OU_DE_SERVICELabels: Record<
  SousMotifDIFFICULTE_DE_RECHERCHE_D_ETABLISSEMENT_OU_D_UN_PROFESSIONNEL_OU_DE_SERVICE,
  string
> = {
  AUTRES: 'Autres',
  GARDE_ET_PERMANENCE_DES_SOINS_AMBULATOIRES: 'Garde et permanence des soins ambulatoires',
  MEDECIN_TRAITANT: 'Médecin traitant',
  SPECIALISTE: 'Spécialiste',
  RECHERCHE_DE_SMR: 'Recherche de SMR',
  ETABLISSEMENT_MEDICO_SOCIAL_PA: 'Établissement médico-social PA',
  ETABLISSEMENT_MEDICO_SOCIAL_PH: 'Établissement médico-social PH',
  TRANSFERT_PAR_MANQUE_DE_LIT: 'Transfert par manque de lit',
  DELAIS_D_ATTENTE_POUR_UNE_PLACE_AU_SEIN_DE_L_ETABLISSEMENT:
    "Délais d'attente pour une place au sein de l'établissement",
  RECHERCHE_D_UN_SERVICE_D_ACCOMPAGNEMENT_A_DOMICILE_PA: "Recherche d'un service d'accompagnement à domicile PA",
  RECHERCHE_D_UN_SERVICE_D_ACCOMPAGNEMENT_A_DOMICILE_PH: "Recherche d'un service d'accompagnement à domicile PH",
};

// Sous-motifs pour: Problèmes environnementaux
export const SOUS_MOTIF_PROBLEMES_ENVIRONNEMENTAUX = {
  PROBLEMATIQUES_OU_GESTION_DES_DECHETS_D_ACTIVITES_DE_SOINS_A_RISQUES_INFECTIEUX_DASRI:
    'PROBLEMATIQUES_OU_GESTION_DES_DECHETS_D_ACTIVITES_DE_SOINS_A_RISQUES_INFECTIEUX_DASRI',
  SITUATION_EXCEPTIONNELLE_EXEMPLE_CANICULE_INNONDATIONS: 'SITUATION_EXCEPTIONNELLE_EXEMPLE_CANICULE_INNONDATIONS',
} as const;

export type SousMotifPROBLEMES_ENVIRONNEMENTAUX = keyof typeof SOUS_MOTIF_PROBLEMES_ENVIRONNEMENTAUX;

export const sousMotifPROBLEMES_ENVIRONNEMENTAUXLabels: Record<SousMotifPROBLEMES_ENVIRONNEMENTAUX, string> = {
  PROBLEMATIQUES_OU_GESTION_DES_DECHETS_D_ACTIVITES_DE_SOINS_A_RISQUES_INFECTIEUX_DASRI:
    "Problématiques ou gestion des déchets d'activités de soins à risques infectieux (DASRI)",
  SITUATION_EXCEPTIONNELLE_EXEMPLE_CANICULE_INNONDATIONS:
    'Situation exceptionnelle (exemple : canicule, innondations..)',
};

// Sous-motifs pour: Problèmes liés au transport Sanitaire
export const SOUS_MOTIF_PROBLEMES_LIES_AU_TRANSPORT_SANITAIRE = {
  CONDITIONS_DE_CONDUITE_DU_VEHICULE: 'CONDITIONS_DE_CONDUITE_DU_VEHICULE',
  CONDITIONS_DE_PRISE_EN_CHARGE_DU_PATIENT_AU_DEBUT_ET_A_LA_FIN_PAR_EXEMPLE_DELAI_D_ATTENTE_LIEU_DE_DEPOT:
    'CONDITIONS_DE_PRISE_EN_CHARGE_DU_PATIENT_AU_DEBUT_ET_A_LA_FIN_PAR_EXEMPLE_DELAI_D_ATTENTE_LIEU_DE_DEPOT',
  DEFAUT_D_OFFRE: 'DEFAUT_D_OFFRE',
  DEFAUT_DE_GARDE: 'DEFAUT_DE_GARDE',
  NON_RESPECT_DES_DISPOSITIONS_REGLEMENTAIRES_EN_VIGUEUR_ABSENCE_DE_TENUE_PROFESSIONNELLE_VEHICULE_NONCONFORME_ET_HYGIENE_NON_RESPECT_DE_L_OBLIGATION_DE_PRESENCE_D_UN_AMBULANCIER_DANS_LA_CELLULE_SANITAIRE:
    'NON_RESPECT_DES_DISPOSITIONS_REGLEMENTAIRES_EN_VIGUEUR_ABSENCE_DE_TENUE_PROFESSIONNELLE_VEHICULE_NONCONFORME_ET_HYGIENE_NON_RESPECT_DE_L_OBLIGATION_DE_PRESENCE_D_UN_AMBULANCIER_DANS_LA_CELLULE_SANITAIRE',
  TRANSFERT_ENTRE_ETABLISSEMENTS: 'TRANSFERT_ENTRE_ETABLISSEMENTS',
} as const;

export type SousMotifPROBLEMES_LIES_AU_TRANSPORT_SANITAIRE =
  keyof typeof SOUS_MOTIF_PROBLEMES_LIES_AU_TRANSPORT_SANITAIRE;

export const sousMotifPROBLEMES_LIES_AU_TRANSPORT_SANITAIRELabels: Record<
  SousMotifPROBLEMES_LIES_AU_TRANSPORT_SANITAIRE,
  string
> = {
  CONDITIONS_DE_CONDUITE_DU_VEHICULE: 'Conditions de conduite du véhicule',
  CONDITIONS_DE_PRISE_EN_CHARGE_DU_PATIENT_AU_DEBUT_ET_A_LA_FIN_PAR_EXEMPLE_DELAI_D_ATTENTE_LIEU_DE_DEPOT:
    "Conditions de prise en charge du patient au début et à la fin (par exemple, délai d'attente, lieu de dépôt...)",
  DEFAUT_D_OFFRE: "Défaut d'offre",
  DEFAUT_DE_GARDE: 'Défaut de garde',
  NON_RESPECT_DES_DISPOSITIONS_REGLEMENTAIRES_EN_VIGUEUR_ABSENCE_DE_TENUE_PROFESSIONNELLE_VEHICULE_NONCONFORME_ET_HYGIENE_NON_RESPECT_DE_L_OBLIGATION_DE_PRESENCE_D_UN_AMBULANCIER_DANS_LA_CELLULE_SANITAIRE:
    "Non-respect des dispositions réglementaires en vigueur (absence de tenue professionnelle, véhicule nonconforme et hygiène, non-respect de l'obligation de présence d'un ambulancier dans la cellule sanitaire...)",
  TRANSFERT_ENTRE_ETABLISSEMENTS: 'Transfert entre établissements',
} as const;

export const REQUETE_CLOTURE_REASON = {
  MESURES_CORRECTIVES: 'MESURES_CORRECTIVES',
  ABSENCE_DE_RETOUR: 'ABSENCE_DE_RETOUR',
  HORS_COMPETENCE: 'HORS_COMPETENCE',
  MISSION_D_INSPECTION_ET_CONTROLE: 'MISSION_D_INSPECTION_ET_CONTROLE',
  SANS_SUITE: 'SANS_SUITE',
  AUTRE: 'AUTRE',
} as const;

export type RequeteClotureReason = keyof typeof REQUETE_CLOTURE_REASON;

export const requeteClotureReasonLabels: Record<RequeteClotureReason, string> = {
  MESURES_CORRECTIVES: "Mesures correctives prises par l'établissement / le mis en cause",
  ABSENCE_DE_RETOUR: 'Absence de retour/accord requérant',
  HORS_COMPETENCE: 'Hors compétence',
  MISSION_D_INSPECTION_ET_CONTROLE: 'Mission d’inspection et contrôle',
  SANS_SUITE: 'Sans suite',
  AUTRE: 'Autre',
} as const;
