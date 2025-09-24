export type CreateRequeteFromDematSocialMinimalDto = {
  dematSocialId: number;
  createdAt: Date;
  entiteIds?: string[];
  receptionTypeId?: string;
  receptionDate?: Date;
  commentaire?: string;
};

// export type CreateRequeteFromDematSocialDto = {
//   dematSocialId: number;
//   createdAt: Date;
//   entiteIds: string[];
//   receptionTypeId: string;
//   receptionDate: Date;
//   commentaire: string;
// };

type Declarant = {
  ageId: string | null;
  telephone: string | null;
  estHandicapee: boolean | null;
  lienVictimeId: string | null;
  estVictime: boolean;
  estAnonyme: boolean | null;
  adresse: {
    label: string;
    codePostal: string;
    ville: string;
    rue: string;
    numero: string;
  } | null;
};

type Participant = {
  telephone: string | null;
  ageId: string | null;
  adresse: {
    label: string;
    codePostal: string;
    ville: string;
    rue: string;
    numero: string;
  } | null;
  estHandicapee: boolean | null;
  estVictimeInformee: boolean | null;
  victimeInformeeCommentaire: string | null;
  autrePersonnes: string | null;
} | null;

type LieuDeSurvenue = {
  codePostal: string;
  commentaire: string;
  adresse: {
    label: string;
    codePostal: string;
    ville: string;
    rue: string;
    numero: string;
  } | null;
  lieuTypeId: string | null;
  transportTypeId: string | null;
  societeTransport: string;
  finess: string;
};

type MisEnCause = {
  misEnCauseTypeId: string | null;
  professionTypeId: string | null;
  professionDomicileTypeId: string | null;
  rpps: string | null;
  commentaire: string | null;
};

type DemarchesEngagees = {
  demarches: string[];
  dateContactEtablissement: Date | null;
  etablissementARepondu: boolean;
  organisme: string;
  datePlainte: Date | null;
  autoriteTypeId: string | null;
};

type Fait = {
  motifs: string[];
  consequences: string[];
  maltraitanceTypes: string[];
  dateDebut: Date | null;
  dateFin: Date | null;
  commentaire: string | null;
};

type Situation = {
  lieuDeSurvenue: LieuDeSurvenue;
  misEnCause: MisEnCause;
  demarchesEngagees: DemarchesEngagees;
  faits: Fait[];
  entiteIds: string[];
};

export type CreateRequeteFromDematSocialDto = {
  receptionDate: Date;
  receptionTypeId: string;
  dematSocialId: number;
  declarant: Declarant;
  participant: Participant;
  situations: Situation[];
};
