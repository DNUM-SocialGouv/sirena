type Adresse = {
  label?: string;
  codePostal?: string;
  ville?: string;
  rue?: string;
  numero?: string;
};

type ThirdPartyDeclarant = {
  nom: string;
  prenom: string;
  civiliteId?: string;
  email?: string;
  ageId?: string;
  telephone?: string;
  estHandicapee?: boolean;
  lienVictimeId?: string;
  estVictime?: boolean;
  veutGarderAnonymat?: boolean;
  adresse?: Adresse;
};

type ThirdPartyVictime = {
  nom: string;
  prenom: string;
  civiliteId?: string;
  email?: string;
  telephone?: string;
  ageId?: string;
  adresse?: Adresse;
  estHandicapee?: boolean;
};

type ThirdPartyLieuDeSurvenue = {
  codePostal?: string;
  commentaire?: string;
  adresse?: Adresse;
  lieuTypeId?: string;
  lieuPrecision?: string;
  transportTypeId?: string;
  societeTransport?: string;
  finess?: string;
  tutelle?: string;
  categCode?: string;
  categLib?: string;
};

type ThirdPartyMisEnCause = {
  misEnCauseTypeId?: string;
  misEnCauseTypePrecisionId?: string;
  rpps?: string;
  commentaire?: string;
};

type ThirdPartyDemarchesEngagees = {
  demarches?: string[];
  dateContactEtablissement?: Date;
  etablissementARepondu?: boolean;
  commentaire?: string;
  datePlainte?: Date;
  autoriteTypeId?: string;
};

type ThirdPartyFait = {
  motifsDeclaratifs?: string[];
  consequences?: string[];
  maltraitanceTypes?: string[];
  dateDebut?: Date;
  dateFin?: Date;
  commentaire?: string;
};

type ThirdPartySituation = {
  lieuDeSurvenue?: ThirdPartyLieuDeSurvenue;
  misEnCause?: ThirdPartyMisEnCause;
  demarchesEngagees?: ThirdPartyDemarchesEngagees;
  faits?: ThirdPartyFait[];
};

export type CreateRequeteFromThirdPartyDto = {
  thirdPartyAccountId: string;
  receptionDate: Date;
  receptionTypeId: string;
  declarant: ThirdPartyDeclarant;
  victime: ThirdPartyVictime;
  situations: ThirdPartySituation[];
};
