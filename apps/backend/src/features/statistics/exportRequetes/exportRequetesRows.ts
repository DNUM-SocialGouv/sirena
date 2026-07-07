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

type ExportAdresseRecord = {
  codePostal: string | null;
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
  mesureProtection?: Parameters<typeof getMesureProtectionShortLabel>[0];
  estHandicapee: boolean | null;
  aAutrePersonnes: boolean | null;
  autrePersonnes?: string | null;
};

type ExportRequeteEntiteRecord = {
  entiteId: string;
  entite: ExportLabelRecord | null;
  statut: ExportLabelRecord | null;
  priorite?: ExportLabelRecord | null;
};

type ExportRequeteEtapeRecord = {
  entiteId: string;
  statutId: string;
  createdAt: Date;
  clotureEffectiveDate?: Date | null;
  clotureReason: ExportLabelRecord[];
};

type ExportLieuDeSurvenueRecord = {
  lieuTypeId?: string | null;
  lieuType?: ExportLabelRecord | null;
  lieuPrecision?: string | null;
  transportType?: ExportLabelRecord | null;
  finess?: string | null;
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
  motifs: Array<{ motif: ExportLabelRecord | null }>;
  consequences: Array<{ consequence: ExportLabelRecord | null }>;
};

type ExportDemarchesEngageesRecord = {
  dateContactEtablissement?: Date | null;
  etablissementARepondu?: boolean | null;
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

export function buildExportRequetesRows(
  requetes: ExportRequeteRecord[],
  options: { topEntiteId?: string } = {},
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
  options: { topEntiteId?: string },
  situationIndex?: number,
): ExportRequetesCsvRow {
  return toExportRequetesCsvRow({
    ...buildRequeteFields(requete),
    ...buildDeclarantFields(requete.declarant),
    ...buildPersonneConcerneeFields(requete.participant),
    ...buildSituationFields(situation, situationIndex),
    ...buildFaitsFields(situation?.faits ?? []),
    ...buildDemarchesFields(situation?.demarchesEngagees),
    ...buildWorkflowFields(requete, options),
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

function buildDeclarantFields(declarant: ExportDeclarantRecord | null | undefined): ExportRequeteKeyedRow {
  return {
    declarantEstPersonneConcernee: formatExportBoolean(declarant?.estVictime),
    lienPersonneConcernee: formatLienVictime(declarant),
    declarantEstTuteurCurateur: formatExportBoolean(declarant?.isTuteur),
    codePostalDeclarant: declarant?.adresse?.codePostal ?? '',
    declarantConsentIdentiteCommuniquee: formatConsentIdentite(declarant?.veutGarderAnonymat),
    declarantProfessionnelEig: formatExportBoolean(declarant?.estSignalementProfessionnel),
  };
}

function buildPersonneConcerneeFields(participant: ExportParticipantRecord | null | undefined): ExportRequeteKeyedRow {
  return {
    civilitePersonneConcernee: participant?.identite?.civilite?.label ?? '',
    trancheAgePersonneConcernee: participant?.age?.label ?? '',
    anneeNaissancePersonneConcernee: participant?.age?.label ? '' : formatExportYear(participant?.dateNaissance),
    codePostalPersonneConcernee: participant?.adresse?.codePostal ?? '',
    personneConcerneeConsentIdentiteCommuniquee: formatConsentIdentite(participant?.veutGarderAnonymat),
    personneConcerneeInformeeDemarche: formatExportBoolean(participant?.estVictimeInformee),
    mesureProtectionPersonneConcernee: getMesureProtectionShortLabel(participant?.mesureProtection) ?? '',
    personneConcerneeHandicap: formatExportBoolean(participant?.estHandicapee),
    autrePersonneConcernee: participant?.aAutrePersonnes ? (participant.autrePersonnes ?? '') : '',
  };
}

function buildSituationFields(
  situation: ExportSituationRecord | null,
  situationIndex: number | undefined,
): ExportRequeteKeyedRow {
  const lieuDeSurvenue = situation?.lieuDeSurvenue;
  const misEnCause = situation?.misEnCause;

  return {
    numeroSituation: situation ? (situationIndex ?? 0) + 1 : '',
    typeLieuSurvenue: lieuDeSurvenue?.lieuType?.label ?? '',
    precisionTypeLieuSurvenue: formatLieuSurvenuePrecision(lieuDeSurvenue),
    finessLieuSurvenue: lieuDeSurvenue?.finess ?? '',
    categorieFinessLieuSurvenue: lieuDeSurvenue?.categLib ?? '',
    codePostalLieuSurvenue: lieuDeSurvenue?.codePostal || lieuDeSurvenue?.adresse?.codePostal || '',
    typeMisEnCause: misEnCause?.misEnCauseType?.label ?? '',
    precisionTypeMisEnCause: misEnCause?.misEnCauseTypePrecision?.label || misEnCause?.autrePrecision || '',
    finessMisEnCause: misEnCause?.finess ?? '',
    nomService: misEnCause?.nomService ?? '',
    codePostalMisEnCause: misEnCause?.codePostal ?? '',
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
    motifsQualifies: formatUniqueLabels(faits.flatMap((fait) => fait.motifs.map((motif) => motif.motif?.label))),
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
    datePriseContact: formatExportDate(demarchesEngagees?.dateContactEtablissement),
    dateDepotPlainte: formatExportDate(demarchesEngagees?.datePlainte),
    lieuDepotPlainte: demarchesEngagees?.autoriteType?.label ?? '',
    demarchesAutresOrganismes: formatUniqueLabels(demarchesEngagees?.demarches.map((demarche) => demarche.label) ?? []),
  };
}

function buildWorkflowFields(requete: ExportRequeteRecord, options: { topEntiteId?: string }): ExportRequeteKeyedRow {
  const requeteEntiteRacine = requete.requeteEntites?.find(
    (requeteEntite) => requeteEntite.entiteId === options.topEntiteId,
  );
  const etapeCloturee = getLatestEtapeCloturee(requete.etapes, options.topEntiteId);

  return {
    statutRequeteEntiteAdministrative: requeteEntiteRacine?.statut?.label ?? '',
    entitesStatutsRequete: formatRequeteEntites(requete.requeteEntites),
    prioriteRequeteEntiteAdministrative: requeteEntiteRacine?.priorite?.label ?? '',
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
