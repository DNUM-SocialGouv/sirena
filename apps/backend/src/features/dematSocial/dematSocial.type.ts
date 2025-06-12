import {
  type CONSEQUENCE_SUR_LA_VICTIME,
  type NATURE_LIEU,
  type PROFESSIONNEL_MIS_EN_CAUSE,
  SERVICE_A_DOMICILE,
  type TRANCHE_AGE,
  type TYPE_DE_FAITS,
  type TYPE_DE_MALTRAITANCE,
  type TYPE_DE_MIS_EN_CAUSE,
  type TYPE_DE_TRANSPORT,
} from './dematSocial.constants';

export type ProffessionnelMisEnCause = (typeof PROFESSIONNEL_MIS_EN_CAUSE)[keyof typeof PROFESSIONNEL_MIS_EN_CAUSE];

export type TypeDeMaltraitance = (typeof TYPE_DE_MALTRAITANCE)[keyof typeof TYPE_DE_MALTRAITANCE];

export type ConsequenceSurLaVictime = (typeof CONSEQUENCE_SUR_LA_VICTIME)[keyof typeof CONSEQUENCE_SUR_LA_VICTIME];

export type TypeDeTransport = (typeof TYPE_DE_TRANSPORT)[keyof typeof TYPE_DE_TRANSPORT];

export type ServiceADomicile = (typeof SERVICE_A_DOMICILE)[keyof typeof SERVICE_A_DOMICILE];

type NatureLieu = (typeof NATURE_LIEU)[keyof typeof NATURE_LIEU];

type TypeDeFaits = (typeof TYPE_DE_FAITS)[keyof typeof TYPE_DE_FAITS];

type TrancheAge = (typeof TRANCHE_AGE)[keyof typeof TRANCHE_AGE];

export type TypeDeMisEnCause = (typeof TYPE_DE_MIS_EN_CAUSE)[keyof typeof TYPE_DE_MIS_EN_CAUSE];

type Civilite = 'M.' | 'Mme' | 'Mx';

type EtablissementSanitaireEtSocial = {
  et_finess: string; // format: \\d[AB\\d]\\d{7}
  codeCategorieEtablissement?: string;
  nomEtablissement?: string;
  typeDeMisEnCause?: string;
};

type Domicile = {
  adresse: string;
  serviceADomicile?: ServiceADomicile;
};

type Trajet = {
  typeDeTransport: TypeDeTransport;
  nomSociete?: string;
  typeDeMisEnCause?: ProffessionnelMisEnCause;
};

type CabinetMedical = {
  informations?: string;
  adresse?: string;
  typeDeMisEnCause?: ProffessionnelMisEnCause;
};

type Description = {
  maltraitance: boolean;
  typeDeMaltraitance?: TypeDeMaltraitance[];
  typesDeFaits: TypeDeFaits[];
  dateSurvenue?: string; // ISO date string
  consequenceSurLaVictime: ConsequenceSurLaVictime[];
  situationToujoursActuelle: 'Oui' | 'Non' | 'Ne sais pas';
  dateDeFin?: string; // ISO date string
  description: string;
};

type MisEnCause = {
  typeDeMisEnCause: TypeDeMisEnCause;
  rpps?: string;
  civilite?: Civilite;
  nom?: string;
  prenom?: string;
  profession?: string;
};

type Declarant = {
  civilite: Civilite;
  prenom: string;
  email?: string;
  telephone: string;
  estLaVictime: boolean;
  langueEtrangere?: boolean;
  lienVictime: 'Membre de la famille' | 'Proche' | 'Professionnel' | 'Autre';
  profession?: string;
  victimeInformeeDemarche: 'oui' | 'non' | 'non connu';
  anonymatVictimeDemande: boolean;
  anonymatMisEnCauseDemande: boolean;
  suiviDemande: boolean;
};

type Victime = {
  civilite: Civilite;
  nom: string;
  prenom: string;
  email?: string;
  adresse?: string;
  telephone?: string;
  trancheAge: TrancheAge;
  enSituationDeHandicap: boolean;
  anonymatMisEnCauseDemande: 'Oui' | 'Non' | 'Inconnu';
  autresPersonnesVictimes: 'Oui' | 'Non' | 'Inconnu';
};

type LieuSurvenue = {
  codePostal: string;
  commune: string;
  natureLieu: NatureLieu;
  etablissementSanitaireEtSocial?: EtablissementSanitaireEtSocial;
  domicile?: Domicile;
  trajet?: Trajet;
  cabinetMedical?: CabinetMedical;
};

type Demarches = {
  contactEtablissementOuPersonneResponsable: {
    contactEffectue: boolean;
    dateDemarche?: string;
    réponseObtenue?: boolean;
    description?: string;
  };
  contactAutreOrganise?: {
    organismesSaisis: string;
  };
  contactForcesDeLOrdre?: {
    juridiction?: string;
    dateDemarche?: string;
  };
};

export type Reclamation = {
  id: string;
  declarant: Declarant;
  victime: Victime;
  lieuSurvenue: LieuSurvenue;
  misEnCause: MisEnCause;
  description: Description;
  demarches: Demarches;
};

export const AUTHORITIES = {
  ARS: 'ARS',
  CD: 'CD',
  DDETS: 'DDETS',
} as const;

export type Authorities = keyof typeof AUTHORITIES;

export const HOME_SERVICES: { value: ServiceADomicile; assignation: Authorities }[] = [
  { value: SERVICE_A_DOMICILE.PROF_LIBERAL, assignation: AUTHORITIES.ARS },
  { value: SERVICE_A_DOMICILE.HAD, assignation: AUTHORITIES.ARS },
  { value: SERVICE_A_DOMICILE.SSIAD, assignation: AUTHORITIES.ARS },
  { value: SERVICE_A_DOMICILE.SAAD, assignation: AUTHORITIES.CD },
  { value: SERVICE_A_DOMICILE.SESSAD, assignation: AUTHORITIES.ARS },
  { value: SERVICE_A_DOMICILE.AIDE_MENAGERE, assignation: AUTHORITIES.CD },
  { value: SERVICE_A_DOMICILE.REPAS, assignation: AUTHORITIES.CD },
  { value: SERVICE_A_DOMICILE.TRAITEMENT, assignation: AUTHORITIES.CD },
  { value: SERVICE_A_DOMICILE.SAADF, assignation: AUTHORITIES.CD },
  { value: SERVICE_A_DOMICILE.MJPM, assignation: AUTHORITIES.DDETS },
  { value: SERVICE_A_DOMICILE.AUTRE, assignation: AUTHORITIES.CD },
] as const;
