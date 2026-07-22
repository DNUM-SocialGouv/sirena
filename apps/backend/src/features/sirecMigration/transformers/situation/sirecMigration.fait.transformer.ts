import type { SirecReclamationData } from '../../sirecMigration.repository.js';
import { transcodeCourrierSignal } from '../../transco/courrierSignal.transco.js';
import { transcodeDest } from '../../transco/dest.transco.js';
import { transcodeMotifsDeclaratifs } from '../../transco/motifsDeclaratifs.transco.js';

export interface SirenaFaitData {
  commentaire?: string;
  autresPrecisions?: string;
  motifsDeclaratifs: string[];
  motifs: string[];
}

export function transformSirecFait(sirecData: SirecReclamationData): SirenaFaitData {
  const destLabel = transcodeDest(sirecData.reclamation.dest);
  const courrierSignalLabel = transcodeCourrierSignal(sirecData.reclamation.courrier_signal);
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
  ].filter(Boolean) as string[];

  return {
    autresPrecisions: autresPrecisionsParts.join('\n'),
    motifsDeclaratifs: [...new Set(transcodeMotifsDeclaratifs(sirecData.motifsDeclaresIdDicos))],
    motifs: [],
  };
}
