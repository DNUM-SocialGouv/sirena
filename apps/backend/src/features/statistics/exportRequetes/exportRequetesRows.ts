import {
  demarcheEngageeLabels,
  MESURE_PROTECTION,
  MOTIFS_HIERARCHICAL_DATA,
  REPONSE_OUI_NON,
  REQUETE_ETAPE_STATUT_TYPES,
  reponseOuiNonLabels,
} from '@sirena/common/constants';
import type { ReponseOuiNonValue } from '@sirena/common/schemas';
import { type CsvValue, getLieuPrecisionLabel, negateReponseOuiNon } from '@sirena/common/utils';
import { getOriginalFileName } from '../../../helpers/fileName.js';
import type { UploadedFile } from '../../../libs/prisma.js';
import { getEtapeTitle } from '../../requeteEtapes/requetesEtapes.title.js';
import { formatRue } from '../../requetesEntite/requeteDisplay.formatters.js';
import { EXPORT_REQUETES_COLUMNS, type ExportRequetesColumnKey } from './exportRequetesColumns.js';
import {
  deriveDepartmentCodeFromPostalCode,
  formatExportBoolean,
  formatExportDate,
  formatExportDateInParis,
  formatExportList,
  formatExportReponseOuiNon,
  toSingleLineText,
  truncateExportCell,
} from './exportRequetesFormatters.js';

export type ExportRequetesCsvRow = CsvValue[];

export type ExportRequeteRecord = {
  id: string | null;
  createdAt: Date | null;
  receptionDate?: Date | null;
  dateDemandeDeclarant?: Date | null;
  receptionType?: ExportLabelRecord | null;
  provenance?: ExportLabelRecord | null;
  provenancePrecision?: string | null;
  dematSocialId?: number | null;
  sirecId?: number | null;
  fichiersRequeteOriginale?: ExportFileRecord[];
  declarant?: ExportDeclarantRecord | null;
  participant?: ExportParticipantRecord | null;
  requeteEntites?: ExportRequeteEntiteRecord[];
  etapes?: ExportRequeteEtapeRecord[];
  situations: ExportSituationRecord[];
};

type ExportLabelRecord = {
  label: string | null;
};

type ExportFileRecord = Pick<UploadedFile, 'fileName' | 'metadata'>;

type ExportAgentRecord = {
  prenom: string;
  nom: string;
};

type ExportEntiteReferenceRecord = ExportLabelRecord & {
  nomComplet?: string | null;
  entiteTypeId?: string | null;
  entiteMere?: ExportLabelRecord | null;
};

type ExportAdresseRecord = {
  codePostal: string | null;
  ville?: string | null;
  numero?: string | null;
  rue?: string | null;
  label?: string | null;
};

type ExportIdentiteRecord = {
  civilite?: ExportLabelRecord | null;
  nom?: string | null;
  prenom?: string | null;
  email?: string | null;
  telephone?: string | null;
};

type ExportDeclarantRecord = {
  estVictime: boolean | null;
  lienVictime?: ExportLabelRecord | null;
  lienAutrePrecision?: string | null;
  isTuteur: boolean | null;
  identite?: ExportIdentiteRecord | null;
  adresse?: ExportAdresseRecord | null;
  veutGarderAnonymat: ReponseOuiNonValue;
  estSignalementProfessionnel: ReponseOuiNonValue;
  commentaire?: string | null;
};

type ExportParticipantRecord = {
  identite?: ExportIdentiteRecord | null;
  age?: ExportLabelRecord | null;
  dateNaissance?: Date | null;
  adresse?: ExportAdresseRecord | null;
  veutGarderAnonymat: ReponseOuiNonValue;
  estVictimeInformee: ReponseOuiNonValue;
  victimeInformeeCommentaire?: string | null;
  mesureProtection?: string | null;
  estHandicapee: ReponseOuiNonValue;
  aAutrePersonnes: ReponseOuiNonValue;
  autrePersonnes?: string | null;
  commentaire?: string | null;
};

type ExportRequeteEntiteRecord = {
  entiteId: string;
  entite: ExportEntiteReferenceRecord | null;
  statut: ExportLabelRecord | null;
  priorite?: ExportLabelRecord | null;
};

type ExportEtapeNoteRecord = {
  texte: string;
  createdAt: Date;
  author?: ExportAgentRecord | null;
};

type ExportRequeteEtapeRecord = {
  entiteId: string;
  nom?: string | null;
  type?: string | null;
  statutId: string | null;
  statut?: ExportLabelRecord | null;
  createdAt: Date;
  dateRealisation?: Date | null;
  clotureEffectiveDate?: Date | null;
  clotureReason: ExportLabelRecord[];
  uploadedFiles?: ExportFileRecord[];
  notes?: ExportEtapeNoteRecord[];
};

type ExportLieuDeSurvenueRecord = {
  lieuTypeId?: string | null;
  lieuType?: ExportLabelRecord | null;
  lieuPrecision?: string | null;
  transportType?: ExportLabelRecord | null;
  codePostal?: string | null;
  adresse?: ExportAdresseRecord | null;
  finess?: string | null;
  societeTransport?: string | null;
  categLib?: string | null;
};

type ExportMisEnCauseRecord = {
  misEnCauseType?: ExportLabelRecord | null;
  misEnCauseTypePrecision?: ExportLabelRecord | null;
  civilite?: string | null;
  nom?: string | null;
  prenom?: string | null;
  rpps?: string | null;
  nomService?: string | null;
  finess?: string | null;
  codePostal?: string | null;
  ville?: string | null;
  autrePrecision?: string | null;
  commentaire?: string | null;
};

type ExportFaitRecord = {
  dateDebut?: Date | null;
  dateFin?: Date | null;
  commentaire?: string | null;
  autresPrecisions?: string | null;
  motifsDeclaratifs: Array<{ motifDeclaratif: ExportLabelRecord | null }>;
  motifs: Array<{ motifId?: string | null; motif: ExportLabelRecord | null }>;
  consequences: Array<{ consequence: ExportLabelRecord | null }>;
  maltraitanceTypes?: Array<{ maltraitanceTypeId: string; maltraitanceType: ExportLabelRecord | null }>;
  fichiers?: ExportFileRecord[];
};

type ExportDemarchesEngageesRecord = {
  dateContactEtablissement?: Date | null;
  etablissementARepondu?: boolean | null;
  organisme?: string | null;
  datePlainte?: Date | null;
  commentaire?: string | null;
  autoriteType?: ExportLabelRecord | null;
  demarches: ExportLabelRecord[];
  etablissementReponse?: ExportFileRecord[];
};

type ExportSituationEntiteRecord = {
  entite: ExportEntiteRecord | null;
};

type ExportEntiteRecord = {
  label: string | null;
  nomComplet?: string | null;
  entiteMere?: ExportEntiteRecord | null;
};

type ExportSituationRecord = {
  sirecDepartement?: string | null;
  estLieAuSignalement?: ReponseOuiNonValue;
  numerosSignalement?: string | null;
  lieuDeSurvenue?: ExportLieuDeSurvenueRecord | null;
  misEnCause?: ExportMisEnCauseRecord | null;
  faits?: ExportFaitRecord[];
  domainesFonctionnels?: ExportLabelRecord | null;
  demarchesEngagees?: ExportDemarchesEngageesRecord | null;
  situationEntites?: ExportSituationEntiteRecord[];
};

type ExportRequeteKeyedRow = Partial<Record<ExportRequetesColumnKey, ExportRequetesCsvRow[number]>>;

type DepartmentReferences = {
  codesByPostalCode?: Map<string, string>;
  namesByCode?: Map<string, string>;
  codesByName?: Map<string, string>;
};

export type BuildExportRequetesRowsOptions = {
  topEntiteId?: string;
  departmentCodesByPostalCode?: Map<string, string>;
  departementNamesByCode?: Map<string, string>;
  departementCodesByName?: Map<string, string>;
};

// Mis en cause civilité is stored as a code (or the RPPS prefix): same display as the form.
const MIS_EN_CAUSE_CIVILITE_LABELS: Record<string, string> = { M: 'M', MME: 'Mme' };
const MALTRAITANCE_TYPE_NONE = 'NON';
const ETAPE_FIELD_SEPARATOR = ' - ';
const ETAPES_SEPARATOR = ' | ';

export function buildExportRequetesRows(
  requetes: ExportRequeteRecord[],
  options: BuildExportRequetesRowsOptions = {},
): ExportRequetesCsvRow[] {
  const departmentReferences: DepartmentReferences = {
    codesByPostalCode: options.departmentCodesByPostalCode,
    namesByCode: options.departementNamesByCode,
    codesByName: options.departementCodesByName,
  };

  return requetes.flatMap((requete) => {
    const requeteEntiteRacine = getRequeteEntiteRacine(requete, options.topEntiteId);
    const shouldExportDepartements = requeteEntiteRacine?.entite?.entiteTypeId === 'ARS';

    // Requête-level cells are identical on every situation row: build them once.
    const requeteFields: ExportRequeteKeyedRow = {
      ...buildRequeteFields(requete),
      ...buildDeclarantFields(requete.declarant, shouldExportDepartements, departmentReferences),
      ...buildPersonneConcerneeFields(requete.participant, shouldExportDepartements, departmentReferences),
      ...buildWorkflowFields(requete, options, requeteEntiteRacine),
    };

    const situations: Array<ExportSituationRecord | null> = requete.situations.length > 0 ? requete.situations : [null];

    return situations.map((situation, index) =>
      toExportRequetesCsvRow({
        ...requeteFields,
        ...buildSituationFields(situation, index, shouldExportDepartements, departmentReferences),
        ...buildFaitsFields(situation?.faits ?? []),
        ...buildDemarchesFields(situation?.demarchesEngagees),
        piecesJointesSituation: formatFileNames([
          ...(situation?.faits ?? []).flatMap((fait) => fait.fichiers ?? []),
          ...(situation?.demarchesEngagees?.etablissementReponse ?? []),
        ]),
      }),
    );
  });
}

function buildRequeteFields(requete: ExportRequeteRecord): ExportRequeteKeyedRow {
  return {
    numeroRequete: requete.id,
    dateCreationRequeteSirena: formatExportDateInParis(requete.createdAt),
    dateReception: formatExportDate(requete.receptionDate),
    modeReception: requete.receptionType?.label ?? '',
    dateDemandeDeclarant: formatExportDate(requete.dateDemandeDeclarant),
    provenance: requete.provenance?.label ?? '',
    precisionProvenance: requete.provenancePrecision ?? '',
    numeroDematSocial: requete.dematSocialId ?? '',
    numeroSirec: requete.sirecId ?? '',
    piecesJointesRequeteOriginale: formatFileNames(requete.fichiersRequeteOriginale ?? []),
  };
}

function buildDeclarantFields(
  declarant: ExportDeclarantRecord | null | undefined,
  shouldExportDepartements: boolean,
  departmentReferences: DepartmentReferences,
): ExportRequeteKeyedRow {
  const codePostalDeclarant = declarant?.adresse?.codePostal ?? '';
  const departementDeclarant =
    departmentReferences.codesByPostalCode?.get(codePostalDeclarant) ??
    deriveDepartmentCodeFromPostalCode(codePostalDeclarant);

  return {
    declarantEstPersonneConcernee: formatExportBoolean(declarant?.estVictime),
    lienPersonneConcernee: formatLienVictime(declarant),
    declarantEstTuteurCurateur: formatExportBoolean(declarant?.isTuteur),
    civiliteDeclarant: declarant?.identite?.civilite?.label ?? '',
    nomDeclarant: declarant?.identite?.nom ?? '',
    prenomDeclarant: declarant?.identite?.prenom ?? '',
    emailDeclarant: declarant?.identite?.email ?? '',
    telephoneDeclarant: declarant?.identite?.telephone ?? '',
    adresseDeclarant: formatRue(declarant?.adresse) ?? '',
    codePostalDeclarant,
    villeDeclarant: declarant?.adresse?.ville ?? '',
    departementDeclarant: shouldExportDepartements
      ? formatDepartementWithName(departementDeclarant, departmentReferences.namesByCode)
      : '',
    declarantConsentIdentiteCommuniquee: formatConsentIdentite(declarant?.veutGarderAnonymat),
    declarantProfessionnelEig: formatExportReponseOuiNon(declarant?.estSignalementProfessionnel),
    autresPrecisionsDeclarant: declarant?.commentaire ?? '',
  };
}

function buildPersonneConcerneeFields(
  participant: ExportParticipantRecord | null | undefined,
  shouldExportDepartements: boolean,
  departmentReferences: DepartmentReferences,
): ExportRequeteKeyedRow {
  const codePostalPersonneConcernee = participant?.adresse?.codePostal ?? '';
  const departementPersonneConcernee =
    departmentReferences.codesByPostalCode?.get(codePostalPersonneConcernee) ??
    deriveDepartmentCodeFromPostalCode(codePostalPersonneConcernee);

  return {
    civilitePersonneConcernee: participant?.identite?.civilite?.label ?? '',
    nomPersonneConcernee: participant?.identite?.nom ?? '',
    prenomPersonneConcernee: participant?.identite?.prenom ?? '',
    trancheAgePersonneConcernee: participant?.age?.label ?? '',
    dateNaissancePersonneConcernee: formatExportDate(participant?.dateNaissance),
    emailPersonneConcernee: participant?.identite?.email ?? '',
    telephonePersonneConcernee: participant?.identite?.telephone ?? '',
    adressePersonneConcernee: formatRue(participant?.adresse) ?? '',
    codePostalPersonneConcernee,
    villePersonneConcernee: participant?.adresse?.ville ?? '',
    departementPersonneConcernee: shouldExportDepartements
      ? formatDepartementWithName(departementPersonneConcernee, departmentReferences.namesByCode)
      : '',
    personneConcerneeConsentIdentiteCommuniquee: formatConsentIdentite(participant?.veutGarderAnonymat),
    personneConcerneeInformeeDemarche: formatExportReponseOuiNon(participant?.estVictimeInformee),
    raisonPersonneConcerneeNonInformee: participant?.victimeInformeeCommentaire ?? '',
    mesureProtectionPersonneConcernee: formatMesureProtection(participant?.mesureProtection),
    personneConcerneeHandicap: formatExportReponseOuiNon(participant?.estHandicapee),
    autrePersonneConcernee: formatExportReponseOuiNon(participant?.aAutrePersonnes),
    // Same rule as the requête PDF: the free text only counts when the answer is "Oui".
    precisionsAutresPersonnesConcernees:
      participant?.aAutrePersonnes === REPONSE_OUI_NON.OUI ? (participant.autrePersonnes ?? '') : '',
    autresPrecisionsPersonneConcernee: participant?.commentaire ?? '',
  };
}

function buildSituationFields(
  situation: ExportSituationRecord | null,
  situationIndex: number | undefined,
  shouldExportDepartements: boolean,
  departmentReferences: DepartmentReferences,
): ExportRequeteKeyedRow {
  const lieuDeSurvenue = situation?.lieuDeSurvenue;
  const misEnCause = situation?.misEnCause;

  const codePostalLieuSurvenueQualifie = lieuDeSurvenue?.adresse?.codePostal;
  const codePostalLieuSurvenue = codePostalLieuSurvenueQualifie || lieuDeSurvenue?.codePostal || '';
  const villeLieuSurvenue = codePostalLieuSurvenueQualifie ? (lieuDeSurvenue?.adresse?.ville ?? '') : '';
  // No postal code: fall back to the department SIREC was handling the request with.
  const departementLieuSurvenue = codePostalLieuSurvenue
    ? (departmentReferences.codesByPostalCode?.get(codePostalLieuSurvenue) ??
      deriveDepartmentCodeFromPostalCode(codePostalLieuSurvenue))
    : (departmentReferences.codesByName?.get(situation?.sirecDepartement ?? '') ?? '');
  const codePostalMisEnCause = misEnCause?.codePostal ?? '';
  const departementMisEnCause =
    departmentReferences.codesByPostalCode?.get(codePostalMisEnCause) ??
    deriveDepartmentCodeFromPostalCode(codePostalMisEnCause);

  return {
    numeroSituation: situation ? (situationIndex ?? 0) + 1 : '',
    situationLieeSignalement: formatExportReponseOuiNon(situation?.estLieAuSignalement),
    numerosSignalement:
      situation?.estLieAuSignalement === REPONSE_OUI_NON.OUI ? (situation.numerosSignalement ?? '') : '',
    typeLieuSurvenue: lieuDeSurvenue?.lieuType?.label ?? '',
    precisionTypeLieuSurvenue: formatLieuSurvenuePrecision(lieuDeSurvenue),
    nomEtablissementLieuSurvenue: lieuDeSurvenue?.adresse?.label || lieuDeSurvenue?.categLib || '',
    finessLieuSurvenue: lieuDeSurvenue?.finess ?? '',
    adresseLieuSurvenue: formatRue(lieuDeSurvenue?.adresse) ?? '',
    codePostalLieuSurvenue,
    villeLieuSurvenue,
    departementLieuSurvenue: shouldExportDepartements
      ? formatDepartementWithName(departementLieuSurvenue, departmentReferences.namesByCode)
      : '',
    societeTransportLieuSurvenue: lieuDeSurvenue?.societeTransport ?? '',
    typeMisEnCause: misEnCause?.misEnCauseType?.label ?? '',
    precisionTypeMisEnCause: misEnCause?.misEnCauseTypePrecision?.label ?? '',
    civiliteMisEnCause: formatMisEnCauseCivilite(misEnCause?.civilite),
    nomMisEnCause: misEnCause?.nom ?? '',
    prenomMisEnCause: misEnCause?.prenom ?? '',
    rppsMisEnCause: misEnCause?.rpps ?? '',
    nomServiceMisEnCause: misEnCause?.nomService ?? '',
    finessMisEnCause: misEnCause?.finess ?? '',
    codePostalMisEnCause,
    villeMisEnCause: misEnCause?.ville ?? '',
    departementMisEnCause: shouldExportDepartements
      ? formatDepartementWithName(departementMisEnCause, departmentReferences.namesByCode)
      : '',
    precisionsMisEnCause: misEnCause?.autrePrecision ?? '',
    commentaireMisEnCause: misEnCause?.commentaire ?? '',
    domaineFonctionnel: situation?.domainesFonctionnels?.label ?? '',
    entitesAdministrativesSituation: formatSituationRootEntites(situation?.situationEntites),
    directionsSituation: formatSituationDirections(situation?.situationEntites),
    servicesSituation: formatSituationServices(situation?.situationEntites),
  };
}

function buildFaitsFields(faits: ExportFaitRecord[]): ExportRequeteKeyedRow {
  return {
    motifsDeclaratifs: formatUniqueLabels(
      faits.flatMap((fait) => fait.motifsDeclaratifs.map((motif) => motif.motifDeclaratif?.label)),
    ),
    typesMaltraitance: formatUniqueLabels(
      faits.flatMap((fait) =>
        (fait.maltraitanceTypes ?? [])
          .filter((maltraitance) => maltraitance.maltraitanceTypeId !== MALTRAITANCE_TYPE_NONE)
          .map((maltraitance) => maltraitance.maltraitanceType?.label),
      ),
    ),
    motifsQualifies: formatUniqueLabels(faits.flatMap((fait) => fait.motifs.map(formatMotifQualifieLabel))),
    consequencesPersonneConcernee: formatUniqueLabels(
      faits.flatMap((fait) => fait.consequences.map((consequence) => consequence.consequence?.label)),
    ),
    dateDebutFaits: formatExportDate(getEarliestDate(faits.map((fait) => fait.dateDebut))),
    dateFinFaits: formatExportDate(getLatestDate(faits.map((fait) => fait.dateFin))),
    explicationFaits: formatUniqueLabels(faits.map((fait) => fait.commentaire)),
    autresPrecisionsFaits: formatUniqueLabels(faits.map((fait) => fait.autresPrecisions)),
  };
}

function buildDemarchesFields(
  demarchesEngagees: ExportDemarchesEngageesRecord | null | undefined,
): ExportRequeteKeyedRow {
  return {
    misEnCauseContacte: demarchesEngagees
      ? formatExportBoolean(
          demarchesEngagees.dateContactEtablissement != null ||
            demarchesEngagees.demarches.some(
              (demarche) => demarche.label === demarcheEngageeLabels.CONTACT_RESPONSABLES,
            ),
        )
      : '',
    datePriseContact: formatExportDate(demarchesEngagees?.dateContactEtablissement),
    declarantRecuReponse: formatExportBoolean(demarchesEngagees?.etablissementARepondu),
    plainteDeposee: demarchesEngagees
      ? formatExportBoolean(
          demarchesEngagees.datePlainte != null ||
            demarchesEngagees.autoriteType?.label != null ||
            demarchesEngagees.demarches.some((demarche) => demarche.label === demarcheEngageeLabels.PLAINTE),
        )
      : '',
    dateDepotPlainte: formatExportDate(demarchesEngagees?.datePlainte),
    lieuDepotPlainte: demarchesEngagees?.autoriteType?.label ?? '',
    demarchesAutresOrganismes: demarchesEngagees
      ? formatExportBoolean(hasDemarchesAutresOrganismes(demarchesEngagees))
      : '',
    organismeContacte: demarchesEngagees?.organisme ?? '',
    commentaireDemarches: demarchesEngagees?.commentaire ?? '',
  };
}

function hasDemarchesAutresOrganismes(demarchesEngagees: ExportDemarchesEngageesRecord): boolean {
  return (
    demarchesEngagees.demarches.some((demarche) => demarche.label === demarcheEngageeLabels.CONTACT_ORGANISME) ||
    (demarchesEngagees.organisme?.trim() ?? '') !== ''
  );
}

function buildWorkflowFields(
  requete: ExportRequeteRecord,
  options: { topEntiteId?: string },
  requeteEntiteRacine: ExportRequeteEntiteRecord | undefined,
): ExportRequeteKeyedRow {
  const etapeCloturee = getLatestEtapeCloturee(requete.etapes, options.topEntiteId);

  return {
    statutRequeteEntiteAdministrative: requeteEntiteRacine?.statut?.label ?? '',
    entitesStatutsRequete: formatRequeteEntites(requete.requeteEntites),
    prioriteRequeteEntiteAdministrative: requeteEntiteRacine?.priorite?.label ?? '',
    derniereDateClotureEntiteAdministrative: formatExportDate(etapeCloturee?.clotureEffectiveDate),
    raisonsClotureEntiteAdministrative: formatExportList(
      etapeCloturee?.clotureReason.map((reason) => reason.label) ?? [],
    ),
    etapesTraitement: formatEtapes(requete, options.topEntiteId),
  };
}

/**
 * All the processing steps the export receives, oldest first, in one cell. Steps of another
 * entity only reach this point when they are shared with the user's entity; they carry that
 * entity's name so they are not mistaken for the user's own steps.
 */
function formatEtapes(requete: ExportRequeteRecord, topEntiteId: string | undefined): string {
  const entiteLabels = new Map(
    (requete.requeteEntites ?? []).map((requeteEntite) => [
      requeteEntite.entiteId,
      requeteEntite.entite?.nomComplet || requeteEntite.entite?.label || '',
    ]),
  );

  return (requete.etapes ?? [])
    .toSorted((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
    .map((etape) => {
      const otherEntiteLabel = topEntiteId && etape.entiteId !== topEntiteId ? entiteLabels.get(etape.entiteId) : null;

      return formatEtape(etape, otherEntiteLabel);
    })
    .join(ETAPES_SEPARATOR);
}

function formatEtape(etape: ExportRequeteEtapeRecord, otherEntiteLabel: string | null | undefined): string {
  const isCloture = etape.statutId === REQUETE_ETAPE_STATUT_TYPES.CLOTUREE;
  const date = formatExportDateInParis(isCloture ? (etape.clotureEffectiveDate ?? etape.createdAt) : etape.createdAt);
  const title = getEtapeTitle(etape.type, etape.statutId, etape.nom ?? '');
  const fileNames = formatFileNames(etape.uploadedFiles ?? []);

  const parts = [
    `${date} ${otherEntiteLabel ? `[${otherEntiteLabel}] ` : ''}${title}`,
    etape.statut?.label ? `Statut : ${etape.statut.label}` : null,
    etape.dateRealisation ? `Date de réalisation : ${formatExportDateInParis(etape.dateRealisation)}` : null,
    isCloture && etape.clotureReason.length > 0
      ? `Motif(s) de clôture : ${formatExportList(etape.clotureReason.map((reason) => reason.label))}`
      : null,
    fileNames ? `Pièces jointes : ${fileNames}` : null,
    ...(etape.notes ?? [])
      .toSorted((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
      .map(formatEtapeNote),
  ];

  return parts.filter((part): part is string => part != null && part !== '').join(ETAPE_FIELD_SEPARATOR);
}

function formatEtapeNote(note: ExportEtapeNoteRecord): string | null {
  const texte = toSingleLineText(note.texte);
  if (!texte) {
    return null;
  }

  // Names as stored, like every other name of the export: re-casing them would break compound
  // names (Île-de-France, Jean-Pierre). A note without author was written by the system.
  const author = [note.author?.prenom, note.author?.nom].filter(Boolean).join(' ') || 'Système';

  return `Note du ${formatExportDateInParis(note.createdAt)} par ${author} : ${texte}`;
}

function formatFileNames(files: ExportFileRecord[]): string {
  return formatUniqueLabels(files.map(getOriginalFileName));
}

function formatMisEnCauseCivilite(civilite: string | null | undefined): string {
  if (!civilite) {
    return '';
  }

  return MIS_EN_CAUSE_CIVILITE_LABELS[civilite] ?? civilite;
}

function formatSituationRootEntites(situationEntites: ExportSituationEntiteRecord[] | undefined): string {
  return formatUniqueLabels(
    situationEntites?.map((situationEntite) => {
      const entiteRacine = getEntiteRacine(situationEntite.entite);

      return entiteRacine?.nomComplet ?? entiteRacine?.label;
    }) ?? [],
  );
}

function formatSituationDirections(situationEntites: ExportSituationEntiteRecord[] | undefined): string {
  return formatUniqueLabels(
    situationEntites?.flatMap((situationEntite) => {
      const entite = situationEntite.entite;

      if (entite && isDirection(entite)) {
        return [formatEntiteWithParentLabel(entite)];
      }

      if (entite && isService(entite) && entite.entiteMere) {
        return [formatEntiteWithParentLabel(entite.entiteMere)];
      }

      return [];
    }) ?? [],
  );
}

function formatEntiteWithParentLabel(entite: ExportEntiteRecord): string | null {
  if (!entite.nomComplet) {
    return entite.label;
  }

  return entite.entiteMere?.label ? `${entite.nomComplet} (${entite.entiteMere.label})` : entite.nomComplet;
}

function formatSituationServices(situationEntites: ExportSituationEntiteRecord[] | undefined): string {
  return formatUniqueLabels(
    situationEntites?.map((situationEntite) => {
      const entite = situationEntite.entite;

      return entite && isService(entite) ? formatEntiteWithParentLabel(entite) : null;
    }) ?? [],
  );
}

function getEntiteRacine(entite: ExportEntiteRecord | null | undefined): ExportEntiteRecord | null {
  if (!entite) {
    return null;
  }

  let current: ExportEntiteRecord = entite;

  while (current.entiteMere) {
    current = current.entiteMere;
  }

  return current;
}

function isDirection(entite: ExportEntiteRecord | null | undefined): boolean {
  return entite != null && entite.entiteMere != null && entite.entiteMere.entiteMere == null;
}

function isService(entite: ExportEntiteRecord | null | undefined): boolean {
  return entite?.entiteMere?.entiteMere != null;
}

function formatUniqueLabels(labels: Array<string | null | undefined>): string {
  return formatExportList(
    Array.from(new Set(labels.filter((label): label is string => label != null && label !== ''))),
  );
}

function formatMotifQualifieLabel(motif: ExportFaitRecord['motifs'][number]): string {
  const fallbackLabel = motif.motif?.label ?? '';
  const [parentValue, childValue] = motif.motifId?.split('/') ?? [];

  if (!parentValue || !childValue) {
    return fallbackLabel;
  }

  const parent = MOTIFS_HIERARCHICAL_DATA.find((motifParent) => motifParent.value === parentValue);
  const child = parent?.children.find((motifChild) => motifChild.value === childValue);

  if (!parent || !child) {
    return fallbackLabel;
  }

  return `${child.label} (${parent.label})`;
}

function getEarliestDate(dates: Array<Date | null | undefined>): Date | null {
  const validDates = dates.filter((date): date is Date => date != null);

  return validDates.toSorted((left, right) => left.getTime() - right.getTime())[0] ?? null;
}

function getLatestDate(dates: Array<Date | null | undefined>): Date | null {
  const validDates = dates.filter((date): date is Date => date != null);

  return validDates.toSorted((left, right) => right.getTime() - left.getTime())[0] ?? null;
}

function formatLieuSurvenuePrecision(lieuDeSurvenue: ExportLieuDeSurvenueRecord | null | undefined): string {
  return formatExportList([
    getLieuPrecisionLabel(lieuDeSurvenue?.lieuTypeId ?? undefined, lieuDeSurvenue?.lieuPrecision ?? undefined),
    lieuDeSurvenue?.transportType?.label,
  ]);
}

function formatRequeteEntites(requeteEntites: ExportRequeteEntiteRecord[] | undefined): string {
  return formatUniqueLabels(
    requeteEntites?.map((requeteEntite) => {
      const entite = requeteEntite.entite;
      const entiteName = entite ? formatEntiteWithParentLabel(entite) : null;
      const statutLabel = requeteEntite.statut?.label;

      if (!entiteName) {
        return null;
      }

      return statutLabel ? `${entiteName} (${statutLabel})` : entiteName;
    }) ?? [],
  );
}

function getRequeteEntiteRacine(
  requete: ExportRequeteRecord,
  topEntiteId: string | undefined,
): ExportRequeteEntiteRecord | undefined {
  return requete.requeteEntites?.find((requeteEntite) => requeteEntite.entiteId === topEntiteId);
}

function formatDepartementWithName(
  departementCode: string,
  departementNamesByCode: Map<string, string> | undefined,
): string {
  if (!departementCode) {
    return '';
  }

  const departementName = departementNamesByCode?.get(departementCode);

  return departementName ? `${departementName} (${departementCode})` : departementCode;
}

function getLatestEtapeCloturee(
  etapes: ExportRequeteEtapeRecord[] | undefined,
  topEntiteId: string | undefined,
): ExportRequeteEtapeRecord | undefined {
  if (!topEntiteId) {
    return undefined;
  }

  return etapes
    ?.filter((etape) => etape.entiteId === topEntiteId && etape.statutId === REQUETE_ETAPE_STATUT_TYPES.CLOTUREE)
    .toSorted((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0];
}

// Same labels as the options of the personne concernée form.
const MESURE_PROTECTION_LABELS: Record<string, string> = {
  [MESURE_PROTECTION.MANDATAIRE_JUDICIAIRE]: 'Mandataire judiciaire',
  [MESURE_PROTECTION.MANDATAIRE_FAMILIAL]: 'Mandataire familial',
  [MESURE_PROTECTION.NON]: 'Non',
  [MESURE_PROTECTION.NON_RENSEIGNE]: reponseOuiNonLabels.NON_RENSEIGNE,
};

function formatMesureProtection(mesureProtection: string | null | undefined): string {
  return mesureProtection ? (MESURE_PROTECTION_LABELS[mesureProtection] ?? '') : '';
}

function formatLienVictime(declarant: ExportDeclarantRecord | null | undefined): string {
  if (!declarant?.lienVictime?.label) {
    return '';
  }

  if (declarant.lienVictime.label.toLowerCase() === 'autre') {
    return declarant.lienAutrePrecision || declarant.lienVictime.label;
  }

  return declarant.lienVictime.label;
}

function formatConsentIdentite(veutGarderAnonymat: ReponseOuiNonValue): string {
  return formatExportReponseOuiNon(negateReponseOuiNon(veutGarderAnonymat));
}

function toExportRequetesCsvRow(row: ExportRequeteKeyedRow): ExportRequetesCsvRow {
  return EXPORT_REQUETES_COLUMNS.map((column) => {
    const value = row[column.key] ?? '';

    return typeof value === 'string' ? truncateExportCell(toSingleLineText(value)) : value;
  });
}
