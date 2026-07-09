import { MOTIFS_HIERARCHICAL_DATA } from '@sirena/common/constants';
import { getLieuPrecisionLabel, getMesureProtectionShortLabel } from '@sirena/common/utils';
import { EXPORT_REQUETES_COLUMNS, type ExportRequetesColumnKey } from './exportRequetesColumns.js';
import type { ExportRequetesCsvRow } from './exportRequetesCsv.js';
import {
  formatExportBoolean,
  formatExportDate,
  formatExportList,
  formatExportYear,
} from './exportRequetesFormatters.js';

export type ExportRequeteRecord = {
  id: string | null;
  createdAt: Date | null;
  receptionDate?: Date | null;
  dateDemandeDeclarant?: Date | null;
  receptionType?: ExportLabelRecord | null;
  provenance?: ExportLabelRecord | null;
  declarant?: ExportDeclarantRecord | null;
  participant?: ExportParticipantRecord | null;
  requeteEntites?: ExportRequeteEntiteRecord[];
  etapes?: ExportRequeteEtapeRecord[];
  situations: ExportSituationRecord[];
};

type ExportLabelRecord = {
  label: string | null;
};

type ExportEntiteReferenceRecord = ExportLabelRecord & {
  entiteTypeId?: string | null;
};

type ExportAdresseRecord = {
  codePostal: string | null;
  label?: string | null;
};

type ExportDeclarantRecord = {
  estVictime: boolean | null;
  lienVictime?: ExportLabelRecord | null;
  lienAutrePrecision?: string | null;
  isTuteur: boolean | null;
  adresse?: ExportAdresseRecord | null;
  veutGarderAnonymat: boolean | null;
  estSignalementProfessionnel: boolean | null;
};

type ExportParticipantRecord = {
  identite?: { civilite?: ExportLabelRecord | null } | null;
  age?: ExportLabelRecord | null;
  dateNaissance?: Date | null;
  adresse?: ExportAdresseRecord | null;
  veutGarderAnonymat: boolean | null;
  estVictimeInformee: boolean | null;
  mesureProtection?: string | null;
  estHandicapee: boolean | null;
  aAutrePersonnes: boolean | null;
  autrePersonnes?: string | null;
};

type ExportRequeteEntiteRecord = {
  entiteId: string;
  entite: ExportEntiteReferenceRecord | null;
  statut: ExportLabelRecord | null;
  priorite?: ExportLabelRecord | null;
};

type ExportRequeteEtapeRecord = {
  entiteId: string;
  type?: string | null;
  statutId: string;
  createdAt: Date;
  dateRealisation?: Date | null;
  clotureEffectiveDate?: Date | null;
  clotureReason: ExportLabelRecord[];
  notes?: Array<{ texte: string | null; authorId?: string | null }>;
};

type ExportLieuDeSurvenueRecord = {
  lieuTypeId?: string | null;
  lieuType?: ExportLabelRecord | null;
  lieuPrecision?: string | null;
  transportType?: ExportLabelRecord | null;
  societeTransport?: string | null;
  finess?: string | null;
  categCode?: string | null;
  categLib?: string | null;
  codePostal?: string | null;
  adresse?: ExportAdresseRecord | null;
};

type ExportMisEnCauseRecord = {
  misEnCauseType?: ExportLabelRecord | null;
  misEnCauseTypePrecision?: ExportLabelRecord | null;
  autrePrecision?: string | null;
  finess?: string | null;
  nomService?: string | null;
  codePostal?: string | null;
  rpps?: string | null;
  nom?: string | null;
  prenom?: string | null;
};

type ExportFaitRecord = {
  dateDebut?: Date | null;
  dateFin?: Date | null;
  motifsDeclaratifs: Array<{ motifDeclaratif: ExportLabelRecord | null }>;
  motifs: Array<{ motifId?: string | null; motif: ExportLabelRecord | null }>;
  consequences: Array<{ consequence: ExportLabelRecord | null }>;
};

type ExportDemarchesEngageesRecord = {
  dateContactEtablissement?: Date | null;
  etablissementARepondu?: boolean | null;
  organisme?: string | null;
  datePlainte?: Date | null;
  autoriteType?: ExportLabelRecord | null;
  demarches: ExportLabelRecord[];
};

type ExportSituationEntiteRecord = {
  entite: ExportEntiteRecord | null;
};

type ExportEntiteRecord = {
  label: string | null;
  entiteMere?: ExportEntiteRecord | null;
};

type ExportSituationRecord = {
  lieuDeSurvenue?: ExportLieuDeSurvenueRecord | null;
  misEnCause?: ExportMisEnCauseRecord | null;
  faits?: ExportFaitRecord[];
  domainesFonctionnels?: ExportLabelRecord | null;
  demarchesEngagees?: ExportDemarchesEngageesRecord | null;
  situationEntites?: ExportSituationEntiteRecord[];
};

type ExportRequeteKeyedRow = Partial<Record<ExportRequetesColumnKey, ExportRequetesCsvRow[number]>>;

export type BuildExportRequetesRowsOptions = {
  topEntiteId?: string;
  categorieFinessLieuSurvenueByCode?: Map<string, string>;
};

export function buildExportRequetesRows(
  requetes: ExportRequeteRecord[],
  options: BuildExportRequetesRowsOptions = {},
): ExportRequetesCsvRow[] {
  return requetes.flatMap((requete) => {
    if (requete.situations.length === 0) {
      return [buildExportRequeteRow(requete, null, options)];
    }

    return requete.situations.map((situation, index) => buildExportRequeteRow(requete, situation, options, index));
  });
}

function buildExportRequeteRow(
  requete: ExportRequeteRecord,
  situation: ExportSituationRecord | null,
  options: BuildExportRequetesRowsOptions,
  situationIndex?: number,
): ExportRequetesCsvRow {
  const requeteEntiteRacine = getRequeteEntiteRacine(requete, options.topEntiteId);
  const shouldExportDepartements = requeteEntiteRacine?.entite?.entiteTypeId === 'ARS';

  return toExportRequetesCsvRow({
    ...buildRequeteFields(requete),
    ...buildDeclarantFields(requete.declarant, shouldExportDepartements),
    ...buildPersonneConcerneeFields(requete.participant, shouldExportDepartements),
    ...buildSituationFields(
      situation,
      situationIndex,
      shouldExportDepartements,
      options.categorieFinessLieuSurvenueByCode,
    ),
    ...buildFaitsFields(situation?.faits ?? []),
    ...buildDemarchesFields(situation?.demarchesEngagees),
    ...buildWorkflowFields(requete, options, requeteEntiteRacine),
  });
}

function buildRequeteFields(requete: ExportRequeteRecord): ExportRequeteKeyedRow {
  return {
    numeroRequete: requete.id,
    dateCreationRequeteSirena: formatExportDate(requete.createdAt),
    dateReception: formatExportDate(requete.receptionDate),
    modeReception: requete.receptionType?.label ?? '',
    dateDemandeDeclarant: formatExportDate(requete.dateDemandeDeclarant),
    provenance: requete.provenance?.label ?? '',
  };
}

function buildDeclarantFields(
  declarant: ExportDeclarantRecord | null | undefined,
  shouldExportDepartements: boolean,
): ExportRequeteKeyedRow {
  const codePostalDeclarant = declarant?.adresse?.codePostal ?? '';

  return {
    declarantEstPersonneConcernee: formatExportBoolean(declarant?.estVictime),
    lienPersonneConcernee: formatLienVictime(declarant),
    declarantEstTuteurCurateur: formatExportBoolean(declarant?.isTuteur),
    codePostalDeclarant,
    departementDeclarant: shouldExportDepartements ? formatDepartementFromCodePostal(codePostalDeclarant) : '',
    declarantConsentIdentiteCommuniquee: formatConsentIdentite(declarant?.veutGarderAnonymat),
    declarantProfessionnelEig: formatExportBoolean(declarant?.estSignalementProfessionnel),
  };
}

function buildPersonneConcerneeFields(
  participant: ExportParticipantRecord | null | undefined,
  shouldExportDepartements: boolean,
): ExportRequeteKeyedRow {
  const codePostalPersonneConcernee = participant?.adresse?.codePostal ?? '';

  return {
    civilitePersonneConcernee: participant?.identite?.civilite?.label ?? '',
    trancheAgePersonneConcernee: participant?.age?.label ?? '',
    anneeNaissancePersonneConcernee: participant?.age?.label ? '' : formatExportYear(participant?.dateNaissance),
    codePostalPersonneConcernee,
    departementPersonneConcernee: shouldExportDepartements
      ? formatDepartementFromCodePostal(codePostalPersonneConcernee)
      : '',
    personneConcerneeConsentIdentiteCommuniquee: formatConsentIdentite(participant?.veutGarderAnonymat),
    personneConcerneeInformeeDemarche: formatExportBoolean(participant?.estVictimeInformee),
    mesureProtectionPersonneConcernee: formatMesureProtectionShortLabel(participant?.mesureProtection),
    personneConcerneeHandicap: formatExportBoolean(participant?.estHandicapee),
    autrePersonneConcernee: formatExportBoolean(participant?.aAutrePersonnes),
  };
}

function buildSituationFields(
  situation: ExportSituationRecord | null,
  situationIndex: number | undefined,
  shouldExportDepartements: boolean,
  categorieFinessLieuSurvenueByCode: Map<string, string> | undefined,
): ExportRequeteKeyedRow {
  const lieuDeSurvenue = situation?.lieuDeSurvenue;
  const misEnCause = situation?.misEnCause;

  const codePostalLieuSurvenue = lieuDeSurvenue?.adresse?.codePostal || lieuDeSurvenue?.codePostal || '';
  const codePostalMisEnCause = misEnCause?.codePostal ?? '';

  return {
    numeroSituation: situation ? (situationIndex ?? 0) + 1 : '',
    typeLieuSurvenue: lieuDeSurvenue?.lieuType?.label ?? '',
    precisionTypeLieuSurvenue: formatLieuSurvenuePrecision(lieuDeSurvenue),
    finessLieuSurvenue: lieuDeSurvenue?.finess ?? '',
    categorieFinessLieuSurvenue: formatCategorieFinessLieuSurvenue(lieuDeSurvenue, categorieFinessLieuSurvenueByCode),
    nomLieuSurvenue: formatNomLieuSurvenue(lieuDeSurvenue),
    codePostalLieuSurvenue,
    departementLieuSurvenue: shouldExportDepartements ? formatDepartementFromCodePostal(codePostalLieuSurvenue) : '',
    typeMisEnCause: misEnCause?.misEnCauseType?.label ?? '',
    precisionTypeMisEnCause: misEnCause?.misEnCauseTypePrecision?.label ?? '',
    finessMisEnCause: misEnCause?.finess ?? '',
    nomService: misEnCause?.nomService ?? '',
    departementMisEnCause: shouldExportDepartements ? formatDepartementFromCodePostal(codePostalMisEnCause) : '',
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
    motifsQualifies: formatUniqueLabels(faits.flatMap((fait) => fait.motifs.map(formatMotifQualifieLabel))),
    consequencesPersonneConcernee: formatUniqueLabels(
      faits.flatMap((fait) => fait.consequences.map((consequence) => consequence.consequence?.label)),
    ),
    dateDebutFaits: formatExportDate(getEarliestDate(faits.map((fait) => fait.dateDebut))),
    dateFinFaits: formatExportDate(getLatestDate(faits.map((fait) => fait.dateFin))),
  };
}

function buildDemarchesFields(
  demarchesEngagees: ExportDemarchesEngageesRecord | null | undefined,
): ExportRequeteKeyedRow {
  return {
    misEnCauseContacte: demarchesEngagees
      ? formatExportBoolean(demarchesEngagees.dateContactEtablissement != null)
      : '',
    datePriseContact: formatExportDate(demarchesEngagees?.dateContactEtablissement),
    declarantRecuReponse: formatExportBoolean(demarchesEngagees?.etablissementARepondu),
    plainteDeposee: demarchesEngagees
      ? formatExportBoolean(demarchesEngagees.datePlainte != null || demarchesEngagees.autoriteType?.label != null)
      : '',
    dateDepotPlainte: formatExportDate(demarchesEngagees?.datePlainte),
    lieuDepotPlainte: demarchesEngagees?.autoriteType?.label ?? '',
    demarchesAutresOrganismes: demarchesEngagees
      ? formatExportBoolean(hasDemarchesAutresOrganismes(demarchesEngagees))
      : '',
  };
}

function hasDemarchesAutresOrganismes(demarchesEngagees: ExportDemarchesEngageesRecord): boolean {
  return (
    demarchesEngagees.demarches.some((demarche) => demarche.label != null) ||
    (demarchesEngagees.organisme?.trim() ?? '') !== ''
  );
}

function buildWorkflowFields(
  requete: ExportRequeteRecord,
  options: { topEntiteId?: string },
  requeteEntiteRacine: ExportRequeteEntiteRecord | undefined,
): ExportRequeteKeyedRow {
  const etapeCloturee = getLatestEtapeCloturee(requete.etapes, options.topEntiteId);
  const accuseReception = getAccuseReceptionEnvoi(requete.etapes, options.topEntiteId);

  return {
    statutRequeteEntiteAdministrative: requeteEntiteRacine?.statut?.label ?? '',
    entitesStatutsRequete: formatRequeteEntites(requete.requeteEntites),
    prioriteRequeteEntiteAdministrative: requeteEntiteRacine?.priorite?.label ?? '',
    dateEnvoiAccuseReceptionEntiteAdministrative: formatExportDate(accuseReception?.date),
    typeEnvoiAccuseReception: accuseReception?.type ?? '',
    derniereDateClotureEntiteAdministrative: formatExportDate(etapeCloturee?.clotureEffectiveDate),
    raisonsClotureEntiteAdministrative: formatExportList(
      etapeCloturee?.clotureReason.map((reason) => reason.label) ?? [],
    ),
  };
}

function formatSituationRootEntites(situationEntites: ExportSituationEntiteRecord[] | undefined): string {
  return formatUniqueLabels(
    situationEntites?.map((situationEntite) => getEntiteRacine(situationEntite.entite)?.label) ?? [],
  );
}

function formatSituationDirections(situationEntites: ExportSituationEntiteRecord[] | undefined): string {
  return formatUniqueLabels(
    situationEntites?.flatMap((situationEntite) => {
      const entite = situationEntite.entite;

      if (entite && isDirection(entite)) {
        return [entite.label];
      }

      if (entite && isService(entite)) {
        return [entite.entiteMere?.label];
      }

      return [];
    }) ?? [],
  );
}

function formatSituationServices(situationEntites: ExportSituationEntiteRecord[] | undefined): string {
  return formatUniqueLabels(
    situationEntites?.map((situationEntite) => {
      const entite = situationEntite.entite;

      return entite && isService(entite) ? entite.label : null;
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

function formatNomLieuSurvenue(lieuDeSurvenue: ExportLieuDeSurvenueRecord | null | undefined): string {
  if (lieuDeSurvenue?.lieuTypeId === 'DOMICILE') {
    return '';
  }

  return lieuDeSurvenue?.adresse?.label || lieuDeSurvenue?.societeTransport || '';
}

function formatCategorieFinessLieuSurvenue(
  lieuDeSurvenue: ExportLieuDeSurvenueRecord | null | undefined,
  categorieFinessLieuSurvenueByCode: Map<string, string> | undefined,
): string {
  if (lieuDeSurvenue?.categLib) {
    return lieuDeSurvenue.categLib;
  }

  if (!lieuDeSurvenue?.categCode) {
    return '';
  }

  return categorieFinessLieuSurvenueByCode?.get(lieuDeSurvenue.categCode) ?? '';
}

function formatRequeteEntites(requeteEntites: ExportRequeteEntiteRecord[] | undefined): string {
  return formatExportList(
    requeteEntites?.map((requeteEntite) => {
      const entiteLabel = requeteEntite.entite?.label;
      const statutLabel = requeteEntite.statut?.label;

      if (!entiteLabel) {
        return null;
      }

      return statutLabel ? `${entiteLabel} (${statutLabel})` : entiteLabel;
    }) ?? [],
  );
}

function getRequeteEntiteRacine(
  requete: ExportRequeteRecord,
  topEntiteId: string | undefined,
): ExportRequeteEntiteRecord | undefined {
  return requete.requeteEntites?.find((requeteEntite) => requeteEntite.entiteId === topEntiteId);
}

function formatDepartementFromCodePostal(codePostal: string): string {
  if (!/^\d{5}$/.test(codePostal)) {
    return '';
  }

  if (codePostal.startsWith('20')) {
    return '20';
  }

  if (codePostal.startsWith('97') || codePostal.startsWith('98')) {
    return codePostal.slice(0, 3);
  }

  return codePostal.slice(0, 2);
}

function getAccuseReceptionEnvoi(
  etapes: ExportRequeteEtapeRecord[] | undefined,
  topEntiteId: string | undefined,
): { date: Date; type: string } | undefined {
  if (!topEntiteId) {
    return undefined;
  }

  for (const etape of etapes ?? []) {
    if (etape.entiteId !== topEntiteId || etape.type !== 'ACKNOWLEDGMENT') {
      continue;
    }

    for (const note of etape.notes ?? []) {
      const emailMatch = note.texte?.match(/Email d'accusé de réception envoyé le (\d{2})\/(\d{2})\/(\d{4})/);

      if (emailMatch) {
        const [, day, month, year] = emailMatch;
        return {
          date: etape.dateRealisation ?? new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))),
          type: note.authorId ? 'Email manuel depuis SIRENA' : 'Email automatique',
        };
      }

      const migratedMatch = note.texte?.match(
        /Date d'envoi de l'accusé de réception au requérant : (\d{2})\/(\d{2})\/(\d{4})/,
      );

      if (migratedMatch) {
        const [, day, month, year] = migratedMatch;
        return {
          date: etape.dateRealisation ?? new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))),
          type: 'Autre',
        };
      }
    }

    if (etape.dateRealisation && etape.statutId === 'FAIT') {
      return { date: etape.dateRealisation, type: 'Autre' };
    }
  }

  return undefined;
}

function getLatestEtapeCloturee(
  etapes: ExportRequeteEtapeRecord[] | undefined,
  topEntiteId: string | undefined,
): ExportRequeteEtapeRecord | undefined {
  if (!topEntiteId) {
    return undefined;
  }

  return etapes
    ?.filter((etape) => etape.entiteId === topEntiteId && etape.statutId === 'CLOTUREE')
    .toSorted((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0];
}

function formatMesureProtectionShortLabel(mesureProtection: string | null | undefined): string {
  if (
    mesureProtection !== 'MANDATAIRE_JUDICIAIRE' &&
    mesureProtection !== 'MANDATAIRE_FAMILIAL' &&
    mesureProtection !== 'NON'
  ) {
    return '';
  }

  return getMesureProtectionShortLabel(mesureProtection) ?? '';
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

function formatConsentIdentite(veutGarderAnonymat: boolean | null | undefined): string {
  if (veutGarderAnonymat == null) {
    return '';
  }

  return formatExportBoolean(!veutGarderAnonymat);
}

function toExportRequetesCsvRow(row: ExportRequeteKeyedRow): ExportRequetesCsvRow {
  return EXPORT_REQUETES_COLUMNS.map((column) => row[column.key] ?? '');
}
