import type { SirecReclamationData } from '../../sirecMigration.repository.js';
import { transcodeMotifsDeclaratifs } from '../../transco/motifsDeclaratifs.transco.js';
import { transcodeSimpleField } from '../../transco/simpleField.transco.js';

export interface SirenaFaitData {
  commentaire?: string;
  autresPrecisions?: string;
  motifsDeclaratifs: string[];
  motifs: string[];
}

export const NIVEAU_COMPETENCE_ARS = 50;

export function transformSirecFait(sirecData: SirecReclamationData): SirenaFaitData {
  const destLabel = transcodeSimpleField(sirecData.reclamation.dest, 'dest');
  const courrierSignalLabel = transcodeSimpleField(sirecData.reclamation.courrier_signal, 'courrierSignal');
  const isNiveauCompetenceArs = sirecData.reclamation.niv_competence_reclam === NIVEAU_COMPETENCE_ARS;
  const autresPrecisionsParts = [
    sirecData.reclamation.prioritaire_precisez
      ? `Précision sur le caractère prioritaire : ${sirecData.reclamation.prioritaire_precisez}`
      : null,
    sirecData.reclamation.description
      ? `Description de la Pré-identification : ${sirecData.reclamation.description}`
      : null,
    destLabel ? `Destinataire(s) de la réclamation : ${destLabel}` : null,
    sirecData.reclamation.dest_primaire ? `Destinataire primaire : ${sirecData.reclamation.dest_primaire}` : null,
    sirecData.reclamation.dest_secondaire ? `Destinataire secondaire : ${sirecData.reclamation.dest_secondaire}` : null,
    courrierSignalLabel ? `Courrier signalé : ${courrierSignalLabel}` : null,
    isNiveauCompetenceArs ? 'Niveau de compétence de traitement de la réclamation : ARS' : null,
    isNiveauCompetenceArs && sirecData.reclamation.prec_niv_comp
      ? `Précisions : ${sirecData.reclamation.prec_niv_comp}`
      : null,
  ].filter(Boolean) as string[];

  return {
    autresPrecisions: autresPrecisionsParts.join('\n'),
    motifsDeclaratifs: [...new Set(transcodeMotifsDeclaratifs(sirecData.motifsDeclaresIdDicos))],
    motifs: [],
  };
}
