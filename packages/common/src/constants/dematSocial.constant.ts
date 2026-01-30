export const DS_AGE = {
  '-18': '-18',
  '18-29': '18-29',
  '30-59': '30-59',
  '60-79': '60-79',
  '>= 80': '>= 80',
  Inconnu: 'Inconnu',
} as const;

export type DsAge = keyof typeof DS_AGE;

export const dsAgeLabels: Record<DsAge, string> = {
  '-18': 'Moins de 18 ans',
  '18-29': 'Entre 18 et 29 ans',
  '30-59': 'Entre 30 et 59 ans',
  '60-79': 'Entre 60 et 79 ans',
  '>= 80': '80 ans et plus',
  Inconnu: 'Inconnu',
};

export const DS_AUTORITE_TYPE = {
  GENDARMERIE: 'GENDARMERIE',
  COMMISSARIAT: 'COMMISSARIAT',
  TRIBUNAL: 'TRIBUNAL',
} as const;

export type DsAutoriteType = keyof typeof DS_AUTORITE_TYPE;

export const dsAutoriteTypeLabels: Record<DsAutoriteType, string> = {
  GENDARMERIE: 'Gendarmerie',
  COMMISSARIAT: 'Commissariat',
  TRIBUNAL: 'Tribunal',
};

export const DS_CONSEQUENCE = {
  SANTE: 'SANTE',
  DROITS: 'DROITS',
  BESOINS: 'BESOINS',
  SOCIAL: 'SOCIAL',
  AUCUNE: 'AUCUNE',
} as const;

export type DsConsequence = keyof typeof DS_CONSEQUENCE;

export const dsConsequenceLabels: Record<DsConsequence, string> = {
  BESOINS: 'Difficulté à manger, se laver, dormir ou recevoir de l’aide',
  SANTE: 'Douleurs, stress, fatigue, blessures',
  SOCIAL: 'Isolement, mise à l’écart, difficulté à participer à des activités, à se rendre à l’école ou au travail',
  DROITS: 'Impossibilité de recevoir de l’aide ou de porter plainte',
  AUCUNE: 'Aucune de ces conséquences',
};

export const DS_DECLARATION_TYPE = {
  QUALITE_COMPORTEMENT: 'QUALITE_COMPORTEMENT',
  FACTURATION_MATERIEL: 'FACTURATION_MATERIEL',
} as const;

export type DsDeclarationType = keyof typeof DS_DECLARATION_TYPE;

export const dsDeclarationTypeLabels: Record<DsDeclarationType, string> = {
  QUALITE_COMPORTEMENT: 'Un problème de qualité de prise en charge ou un comportement inapproprié',
  FACTURATION_MATERIEL: 'Un problème de facturation ou matériel',
} as const;

export const DS_DEMARCHE_ENGAGEE = {
  CONTACT_RESPONSABLES: 'CONTACT_RESPONSABLES',
  PLAINTE: 'PLAINTE',
  AUTRE: 'AUTRE',
  AUCUNE: 'AUCUNE',
} as const;

export type DsDemarcheEngagee = keyof typeof DS_DEMARCHE_ENGAGEE;

export const dsDemarcheEngageeLabels: Record<DsDemarcheEngagee, string> = {
  CONTACT_RESPONSABLES: "L'établissement ou le responsables des faits a été contacté",
  PLAINTE: 'Une plainte a été déposée auprès des autorités judiciaires',
  AUTRE: "D'autres démarches ont été engagées",
  AUCUNE: "Aucune démarche n'est en cours",
};

export const DS_LIEN_VICTIME = {
  MEMBRE_FAMILLE: 'MEMBRE_FAMILLE',
  PROCHE: 'PROCHE',
  PROFESSIONNEL: 'PROFESSIONNEL',
  AUTRE: 'AUTRE',
} as const;

export type DsLienVictime = keyof typeof DS_LIEN_VICTIME;

export const dsLienVictimeLabels: Record<DsLienVictime, string> = {
  MEMBRE_FAMILLE: 'Membre de la famille',
  PROCHE: 'Proche',
  PROFESSIONNEL: 'Professionnel',
  AUTRE: 'Autre',
};

export const DS_LIEU_TYPE = {
  DOMICILE: 'DOMICILE',
  ETABLISSEMENT_SANTE: 'ETABLISSEMENT_SANTE',
  ETABLISSEMENT_PERSONNES_AGEES: 'ETABLISSEMENT_PERSONNES_AGEES',
  ETABLISSEMENT_HANDICAP: 'ETABLISSEMENT_HANDICAP',
  ETABLISSEMENT_SOCIAL: 'ETABLISSEMENT_SOCIAL',
  CABINET: 'CABINET',
  AUTRES_ETABLISSEMENTS: 'AUTRES_ETABLISSEMENTS',
  TRAJET: 'TRAJET',
} as const;

export type DsLieuType = keyof typeof DS_LIEU_TYPE;

export const dsLieuTypeLabels: Record<DsLieuType, string> = {
  DOMICILE: 'À domicile',
  ETABLISSEMENT_SANTE: 'Un établissement de santé, par exemple : CHU, clinique',
  ETABLISSEMENT_PERSONNES_AGEES: 'Un établissement pour personnes âgées, par exemple : EHPAD, résidence autonomie',
  ETABLISSEMENT_HANDICAP:
    'Un établissement pour personnes en situation de handicap, par exemple : maison d’accueil spécialisée',
  ETABLISSEMENT_SOCIAL: 'Un établissement social, par exemple : centre d’hébergement',
  CABINET: 'Un cabinet médical, par exemple : dentiste, médecin généraliste',
  TRAJET: 'Dans un moyen de transport',
  AUTRES_ETABLISSEMENTS: 'Autre, par exemple : salon de tatouage, institut d’esthétique, centre pénitentiaire',
};

export const DS_MALTRAITANCE_TYPE = {
  NEGLIGENCES: 'NEGLIGENCES',
  VIOLENCES: 'VIOLENCES',
  MATERIELLE_FINANCIERE: 'MATERIELLE_FINANCIERE',
  SEXUELLE: 'SEXUELLE',
  NON: 'NON',
} as const;

export type DsMaltraitanceType = keyof typeof DS_MALTRAITANCE_TYPE;

export const dsMaltraitanceTypeLabels: Record<DsMaltraitanceType, string> = {
  NEGLIGENCES: 'Manque de soins, de nourriture, d’hygiène ou de sécurité',
  VIOLENCES: 'Insultes, coups, soin médical ou isolement forcé, autres violences',
  MATERIELLE_FINANCIERE: 'Vol d’argent ou d’objets, confiscation',
  SEXUELLE:
    'Contact physique sans accord sur les parties intimes, attouchements forcés, exhibitionnisme, relation sexuelle forcée',
  NON: 'Aucune de ces situations',
};

export const DS_MIS_EN_CAUSE_TYPE = {
  PROFESSIONNEL: 'PROFESSIONNEL',
  ETABLISSEMENT: 'ETABLISSEMENT',
  MEMBRE_FAMILLE: 'MEMBRE_FAMILLE',
  PROCHE: 'PROCHE',
  AUTRE: 'AUTRE',
  PROFESSIONNEL_DOMICILE: 'PROFESSIONNEL_DOMICILE',
} as const;

export type DsMisEnCauseType = keyof typeof DS_MIS_EN_CAUSE_TYPE;

export const dsMisEnCauseTypeLabels: Record<DsMisEnCauseType, string> = {
  PROFESSIONNEL: 'Un professionnel',
  ETABLISSEMENT: 'L’établissement où se sont déroulés les faits',
  MEMBRE_FAMILLE: 'Un membre de la famille',
  PROCHE: 'Un autre proche, par exemple : voisinage ou connaissance',
  AUTRE: 'Autre',
  PROFESSIONNEL_DOMICILE: 'Un professionnel ou un service d’aide à domicile',
};

export const DS_MOTIF = {
  PROBLEME_COMPORTEMENTAL: 'PROBLEME_COMPORTEMENTAL',
  PROBLEME_FACTURATION: 'PROBLEME_FACTURATION',
  PROBLEME_LOCAUX: 'PROBLEME_LOCAUX',
  NON_RESPECT_DROITS: 'NON_RESPECT_DROITS',
  PROBLEME_ORGANISATION: 'PROBLEME_ORGANISATION',
  PROBLEME_QUALITE_SOINS: 'PROBLEME_QUALITE_SOINS',
  AUTRE: 'AUTRE',
} as const;

export type DsMotif = keyof typeof DS_MOTIF;

export const dsMotifLabels: Record<DsMotif, string> = {
  PROBLEME_QUALITE_SOINS: 'La qualité des soins médicaux ou paramédicaux',
  PROBLEME_COMPORTEMENTAL: "Le comportement d'une personne",
  NON_RESPECT_DROITS: 'Le non-respect des droits ou du secret médical',
  PROBLEME_FACTURATION: 'La facturation ou les honoraires',
  PROBLEME_LOCAUX: 'Les locaux ou la restauration',
  PROBLEME_ORGANISATION: "Un manque d'information sur l'organisation de l'établissement ou du service",
  AUTRE: 'Autre, par exemple : tatouage ou esthétique',
};

export const DS_PROFESSION_DOMICILE_TYPE = {
  PROFESSIONNEL_SANTE: 'PROFESSIONNEL_SANTE',
  AUTRE_PROFESSIONNEL: 'AUTRE_PROFESSIONNEL',
  SERVICE_EDUCATION: 'SERVICE_EDUCATION',
  NPJM: 'NPJM',
  AUTRE: 'AUTRE',
} as const;

export type DsProfessionDomicileType = keyof typeof DS_PROFESSION_DOMICILE_TYPE;

export const dsProfessionDomicileTypeLabels: Record<DsProfessionDomicileType, string> = {
  PROFESSIONNEL_SANTE: 'Un professionnel de santé, par exemple : médecin, infirmier, aide-soignant, ambulancier',
  AUTRE_PROFESSIONNEL: 'Un professionnel d’un service d’aide et d’accompagnement à domicile',
  SERVICE_EDUCATION: 'Un professionnel d’un service d’éducation spéciale et de soins (SESSAD)',
  NPJM: 'Un tuteur, curateur ou mandataire judiciaire',
  AUTRE: 'Une autre personne ou un autre service',
};

export const DS_PROFESSION_TYPE = {
  PROFESSIONNEL_SANTE: 'PROFESSIONNEL_SANTE',
  PROFESSIONNEL_SOCIAL: 'PROFESSIONNEL_SOCIAL',
  NPJM: 'NPJM',
  AUTRE: 'AUTRE',
} as const;

export type DsProfessionType = keyof typeof DS_PROFESSION_TYPE;

export const dsProfessionTypeLabels: Record<DsProfessionType, string> = {
  PROFESSIONNEL_SANTE: 'Un professionnel de santé, par exemple : médecin, dentiste, infirmier, aide-soignant',
  PROFESSIONNEL_SOCIAL: 'Un travailleur social, par exemple : éducateur, assistant social',
  NPJM: 'Un tuteur, curateur ou mandataire judiciaire',
  AUTRE: 'Une autre personne, par exemple : animateur, agent d’entretien, équipe de direction, esthéticien',
};

export const DS_TRANSPORT_TYPE = {
  POMPIER: 'POMPIER',
  ASSU: 'ASSU',
  AMBULANCE: 'AMBULANCE',
  TAXI: 'TAXI',
  AUTRE: 'AUTRE',
} as const;

export type DsTransportType = keyof typeof DS_TRANSPORT_TYPE;

export const dsTransportTypeLabels: Record<DsTransportType, string> = {
  POMPIER: 'Véhicule de pompier',
  ASSU: 'Véhicule du SAMU',
  AMBULANCE: 'Ambulance privée',
  TAXI: 'Taxi subventionné',
  AUTRE: 'Autre moyen de transport',
};
