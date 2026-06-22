import { getMesureProtectionShortLabel } from '@sirena/common/utils';
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

type ExportSituationRecord = Record<string, unknown>;

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
  const rootRequeteEntite = requete.requeteEntites?.find(
    (requeteEntite) => requeteEntite.entiteId === options.topEntiteId,
  );
  const closureEtape = getLatestClosureEtape(requete.etapes, options.topEntiteId);

  return toExportRequetesCsvRow({
    numeroRequete: requete.id,
    declarantEstPersonneConcernee: formatExportBoolean(requete.declarant?.estVictime),
    lienPersonneConcernee: formatLienVictime(requete.declarant),
    declarantEstTuteurCurateur: formatExportBoolean(requete.declarant?.isTuteur),
    codePostalDeclarant: requete.declarant?.adresse?.codePostal ?? '',
    declarantConsentIdentiteCommuniquee: formatConsentIdentite(requete.declarant?.veutGarderAnonymat),
    declarantProfessionnelEig: formatExportBoolean(requete.declarant?.estSignalementProfessionnel),
    civilitePersonneConcernee: requete.participant?.identite?.civilite?.label ?? '',
    trancheAgePersonneConcernee: requete.participant?.age?.label ?? '',
    anneeNaissancePersonneConcernee: requete.participant?.age?.label
      ? ''
      : formatExportYear(requete.participant?.dateNaissance),
    codePostalPersonneConcernee: requete.participant?.adresse?.codePostal ?? '',
    personneConcerneeConsentIdentiteCommuniquee: formatConsentIdentite(requete.participant?.veutGarderAnonymat),
    personneConcerneeInformeeDemarche: formatExportBoolean(requete.participant?.estVictimeInformee),
    mesureProtectionPersonneConcernee: getMesureProtectionShortLabel(requete.participant?.mesureProtection) ?? '',
    personneConcerneeHandicap: formatExportBoolean(requete.participant?.estHandicapee),
    autrePersonneConcernee: requete.participant?.aAutrePersonnes ? (requete.participant.autrePersonnes ?? '') : '',
    numeroSituation: situation ? (situationIndex ?? 0) + 1 : '',
    entitesStatutsRequete: formatRequeteEntites(requete.requeteEntites),
    prioriteRequeteEntiteAdministrative: rootRequeteEntite?.priorite?.label ?? '',
    dateCreationRequeteSirena: formatExportDate(requete.createdAt),
    dateReception: formatExportDate(requete.receptionDate),
    modeReception: requete.receptionType?.label ?? '',
    dateDemandeDeclarant: formatExportDate(requete.dateDemandeDeclarant),
    provenance: requete.provenance?.label ?? '',
    derniereDateClotureEntiteAdministrative: formatExportDate(closureEtape?.clotureEffectiveDate),
    raisonsClotureEntiteAdministrative: formatExportList(
      closureEtape?.clotureReason.map((reason) => reason.label) ?? [],
    ),
  });
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

function getLatestClosureEtape(
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
