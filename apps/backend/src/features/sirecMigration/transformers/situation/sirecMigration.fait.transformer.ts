import type { SirecReclamationData } from '../../sirecMigration.repository.js';
import { transcodeMaltraitanceTypes, transcodeMotifsDeclaratifs } from '../../transco/motifsDeclaratifs.transco.js';
import { transcodeSimpleField } from '../../transco/simpleField.transco.js';

export interface SirenaFaitData {
  commentaire?: string;
  autresPrecisions?: string;
  motifsDeclaratifs: string[];
  maltraitanceTypes: string[];
  motifs: string[];
}

export function transformSirecFait(sirecData: SirecReclamationData): SirenaFaitData {
  const destLabel = transcodeSimpleField(sirecData.reclamation.dest, 'dest');
  const courrierSignalLabel = transcodeSimpleField(sirecData.reclamation.courrier_signal, 'courrierSignal');
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
    maltraitanceTypes: transcodeMaltraitanceTypes(sirecData.motifsDeclaresIdDicos),
    motifs: [],
  };
}
