import type { RequetePrioriteType, RequeteStatutType } from '@sirena/common/constants';

/**
 * Neutral description of a request graph: plain data, no Prisma. Families
 * produce these; the graph builder is the only place that knows the schema.
 */

export type AdresseBlueprint = {
  label: string;
  numero: string;
  rue: string;
  codePostal: string;
  ville: string;
};

export type PersonneBlueprint = {
  civiliteId: string | null;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  ageId: string | null;
  estVictime: boolean;
  estHandicapee: boolean | null;
  veutGarderAnonymat: boolean | null;
  estIdentifie: boolean | null;
  lienVictimeId: string | null;
  mesureProtection: 'MANDATAIRE_JUDICIAIRE' | 'MANDATAIRE_FAMILIAL' | 'NON' | null;
  adresse: AdresseBlueprint | null;
};

export type LieuBlueprint = {
  lieuTypeId: string | null;
  transportTypeId: string | null;
  societeTransport: string;
  finess: string;
  codePostal: string;
  commentaire: string;
  adresse: AdresseBlueprint | null;
};

export type MisEnCauseBlueprint = {
  misEnCauseTypeId: string | null;
  rpps: string | null;
  civilite: string;
  nom: string;
  prenom: string;
  commentaire: string;
};

export type DemarchesBlueprint = {
  demarchesIds: string[];
  datePlainte: Date | null;
  autoriteTypeId: string | null;
  etablissementARepondu: boolean | null;
  dateContactEtablissement: Date | null;
  organisme: string;
  commentaire: string;
};

export type FaitBlueprint = {
  motifsDeclaratifsIds: string[];
  consequencesIds: string[];
  maltraitanceTypesIds: string[];
  dateDebut: Date | null;
  dateFin: Date | null;
  commentaire: string;
};

/** One fait per situation (Fait PK is situationId → 1:1). */
export type SituationBlueprint = {
  lieu: LieuBlueprint;
  misEnCause: MisEnCauseBlueprint;
  demarches: DemarchesBlueprint;
  fait: FaitBlueprint;
  entiteIds: string[];
};

export type FileBlueprint = {
  fileName: string;
  mimeType: string;
  size: number;
};

/** Extra steps added on top of the default creation/acknowledgment steps. */
export type EtapeBlueprint = {
  nom: string;
  statutId: string;
  notes: string[];
  files: FileBlueprint[];
  clotureReasonIds: string[];
  clotureDate: Date | null;
};

export type RequeteBlueprint = {
  familyId: string;
  familyLabel: string;
  origin: 'MANUAL' | 'DEMATSOCIAL';
  receptionType: string;
  receptionDate: Date;
  statutCible: RequeteStatutType;
  prioriteId: RequetePrioriteType | null;
  declarant: PersonneBlueprint;
  participant: PersonneBlueprint | null;
  situations: SituationBlueprint[];
  extraEtapes: EtapeBlueprint[];
  entiteIds: string[];
};
