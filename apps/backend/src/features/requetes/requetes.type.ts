export type ElementLinked = { requeteId?: string; faitSituationId?: string; demarchesEngageesId?: string };

export type File = {
  name: string;
  url: string;
  size: bigint;
  mimeType: string;
};

type Declarant = {
  nom: string;
  prenom: string;
  civiliteId: string | null;
  email: string;
  ageId: string | null;
  telephone: string | null;
  estHandicapee: boolean | null;
  lienVictimeId: string | null;
  estVictime: boolean;
  veutGarderAnonymat: boolean | null;
  adresse: {
    label: string;
    codePostal: string;
    ville: string;
    rue: string;
    numero: string;
  } | null;
};

type Participant = {
  nom: string;
  prenom: string;
  email: string;
  civiliteId: string | null;
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
  veutGarderAnonymat: boolean | null;
  autrePersonnes: string | null;
  aAutrePersonnes?: boolean;
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
  tutelle?: string;
  categCode?: string;
  categLib?: string;
};

type MisEnCause = {
  misEnCauseTypeId: string | null;
  misEnCauseTypePrecisionId: string | null;
  rpps: string | null;
  commentaire: string | null;
};

type DemarchesEngagees = {
  demarches: string[];
  dateContactEtablissement: Date | null;
  etablissementARepondu: boolean;
  commentaire: string;
  datePlainte: Date | null;
  files: File[];
  autoriteTypeId: string | null;
};

type Fait = {
  motifs: string[];
  consequences: string[];
  maltraitanceTypes: string[];
  dateDebut: Date | null;
  dateFin: Date | null;
  commentaire: string | null;
  files: File[];
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
  pdf?: File | null;
};
