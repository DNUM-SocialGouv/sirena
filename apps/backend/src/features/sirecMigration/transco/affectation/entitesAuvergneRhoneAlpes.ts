import type { EntiteSirenaLabels } from './affectation.transco.js';
import { SIREC_GROUP_MODE } from './sirecGroupMode.js';

const ARS_AUVERGNE_RHONE_ALPES = 'ARS Auvergne-Rhône-Alpes';

function dd(numero: string, poleLabel: string): [EntiteSirenaLabels, EntiteSirenaLabels, EntiteSirenaLabels] {
  const parentLabel = `DD-${numero}`;
  return [
    {
      label: `${parentLabel} Affectée pour traitement`,
      parentLabel,
      grandParentLabel: ARS_AUVERGNE_RHONE_ALPES,
      groupMode: SIREC_GROUP_MODE.ECRITURE,
    },
    {
      label: `${parentLabel} Partagée pour lecture`,
      parentLabel,
      grandParentLabel: ARS_AUVERGNE_RHONE_ALPES,
      groupMode: SIREC_GROUP_MODE.LECTURE,
    },
    { label: poleLabel, parentLabel: ARS_AUVERGNE_RHONE_ALPES },
  ];
}

export const AFFECTATION_ENTITES_AUVERGNE_RHONE_ALPES: Record<number, [EntiteSirenaLabels, ...EntiteSirenaLabels[]]> = {
  705: dd('01', 'Pole OSH 01-69'),
  707: dd('03', 'POLE OSH 03-15-63'),
  709: dd('07', 'POLE OSH 07-26'),
  711: dd('15', 'POLE OSH 03-15-63'),
  713: dd('26', 'POLE OSH 07-26'),
  715: dd('38', 'POLE OSH 38'),
  717: dd('42', 'POLE 0SH 42-43'),
  719: dd('43', 'POLE 0SH 42-43'),
  721: dd('63', 'POLE OSH 03-15-63'),
  723: dd('69', 'Pole OSH 01-69'),
  725: dd('73', 'POLE OSH 73-74'),
  727: dd('74', 'POLE OSH 73-74'),
  4974: [{ label: 'DOS périnatalité', parentLabel: ARS_AUVERGNE_RHONE_ALPES }],
  703: [{ label: 'Pole Usagers Réclamations', parentLabel: ARS_AUVERGNE_RHONE_ALPES }],
};
