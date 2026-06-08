import { REQUETE_ETAPE_STATUT_TYPES } from '@sirena/common/constants';
import { formatSirecDate } from '../../../../helpers/sirecMigration.js';
import type { SirecReclamationData } from '../../sirecMigration.repository.js';
import { SirecDataError } from '../../transco/sirecTransco.error.js';
import type { SirenaEtapeData } from './sirecMigration.etape.types.js';

function resolveInstitutionNom(token: string, institutionPartenaires: Record<number, string>): string {
  if (/^\d+$/.test(token)) {
    const id = Number(token);
    const nom = institutionPartenaires[id];
    if (nom === undefined) throw new SirecDataError(`Institution partenaire introuvable pour l'id ${id}`);
    return nom;
  }
  return token;
}

function formatTransfertNote(date: Date | null): string {
  if (date === null) return 'Date de transfert non renseignée';
  return `Date de transfert : ${formatSirecDate(date)}`;
}

export const NIVEAU_COMPETENCE_PARTAGEE = 52;
export const NIVEAU_COMPETENCE_HORS_ARS = 54;

export function transformSirecInstitutionsPartenaires(
  sirecData: SirecReclamationData,
  arsEntiteIds: string[],
): SirenaEtapeData[] {
  const {
    institution_part,
    niv_competence_reclam,
    prec_niv_comp,
    date_transfert_instit1,
    date_transfert_instit2,
    date_transfert_instit3,
  } = sirecData.reclamation;

  if (!institution_part) return [];
  if (niv_competence_reclam !== NIVEAU_COMPETENCE_PARTAGEE && niv_competence_reclam !== NIVEAU_COMPETENCE_HORS_ARS)
    return [];

  const prefix =
    niv_competence_reclam === NIVEAU_COMPETENCE_PARTAGEE
      ? "Réponse hors compétence à l'institution : "
      : "Transfert à l'institution : ";

  const transferDates: (Date | null)[] = [date_transfert_instit1, date_transfert_instit2, date_transfert_instit3];
  const tokens = institution_part
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const etapes: SirenaEtapeData[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const institutionNom = resolveInstitutionNom(tokens[i], sirecData.institutionPartenaires);
    const date = i < 3 ? transferDates[i] : null;

    const noteParts: string[] = [formatTransfertNote(date)];
    if (prec_niv_comp !== null) noteParts.push(`Précision : ${prec_niv_comp}`);

    for (const entiteId of arsEntiteIds) {
      etapes.push({
        nom: `${prefix}${institutionNom}`,
        entiteId,
        statutId: date !== null ? REQUETE_ETAPE_STATUT_TYPES.FAIT : REQUETE_ETAPE_STATUT_TYPES.A_FAIRE,
        ...(date !== null ? { createdAt: date } : {}),
        note: noteParts.join('\n'),
      });
    }
  }

  return etapes;
}
