import { getMesureProtectionShortLabel } from '@sirena/common/utils';
import { EXPORT_REQUETES_HEADERS } from './exportRequetesColumns.js';
import type { ExportRequetesCsvRow } from './exportRequetesCsv.js';
import { formatExportBoolean, formatExportDate, formatExportYear } from './exportRequetesFormatters.js';

export type ExportRequeteRecord = {
  id: string | null;
  createdAt: Date | null;
  receptionDate?: Date | null;
  dateDemandeDeclarant?: Date | null;
  receptionType?: ExportLabelRecord | null;
  provenance?: ExportLabelRecord | null;
  declarant?: ExportDeclarantRecord | null;
  participant?: ExportParticipantRecord | null;
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

type ExportSituationRecord = Record<string, unknown>;

export function buildExportRequetesRows(requetes: ExportRequeteRecord[]): ExportRequetesCsvRow[] {
  return requetes.flatMap((requete) => {
    if (requete.situations.length === 0) {
      return [buildExportRequeteRow(requete, null)];
    }

    return requete.situations.map((situation, index) => buildExportRequeteRow(requete, situation, index));
  });
}

function buildExportRequeteRow(
  requete: ExportRequeteRecord,
  situation: ExportSituationRecord | null,
  situationIndex?: number,
): ExportRequetesCsvRow {
  const row = createEmptyExportRow();

  row[0] = requete.id;
  row[1] = formatExportBoolean(requete.declarant?.estVictime);
  row[2] = formatLienVictime(requete.declarant);
  row[3] = formatExportBoolean(requete.declarant?.isTuteur);
  row[4] = requete.declarant?.adresse?.codePostal ?? '';
  row[5] = formatConsentIdentite(requete.declarant?.veutGarderAnonymat);
  row[6] = formatExportBoolean(requete.declarant?.estSignalementProfessionnel);
  row[7] = requete.participant?.identite?.civilite?.label ?? '';
  row[8] = requete.participant?.age?.label ?? '';
  row[9] = requete.participant?.age?.label ? '' : formatExportYear(requete.participant?.dateNaissance);
  row[10] = requete.participant?.adresse?.codePostal ?? '';
  row[11] = formatConsentIdentite(requete.participant?.veutGarderAnonymat);
  row[12] = formatExportBoolean(requete.participant?.estVictimeInformee);
  row[13] = getMesureProtectionShortLabel(requete.participant?.mesureProtection) ?? '';
  row[14] = formatExportBoolean(requete.participant?.estHandicapee);
  row[15] = requete.participant?.aAutrePersonnes ? (requete.participant.autrePersonnes ?? '') : '';
  row[16] = situation ? (situationIndex ?? 0) + 1 : '';
  row[50] = formatExportDate(requete.createdAt);
  row[51] = formatExportDate(requete.receptionDate);
  row[52] = requete.receptionType?.label ?? '';
  row[53] = formatExportDate(requete.dateDemandeDeclarant);
  row[54] = requete.provenance?.label ?? '';

  return row;
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

function createEmptyExportRow(): ExportRequetesCsvRow {
  return Array.from({ length: EXPORT_REQUETES_HEADERS.length }, () => '');
}
