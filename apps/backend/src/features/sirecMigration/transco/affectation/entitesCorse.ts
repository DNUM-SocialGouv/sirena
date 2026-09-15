import type { EntiteSirenaLabels } from './affectation.transco.js';

export const AFFECTATION_ENTITES_CORSE: Record<number, [EntiteSirenaLabels, ...EntiteSirenaLabels[]]> = {
  1059: [
    { label: 'Direction adjointe de la santé environnementale et de la veille sanitaire', parentLabel: 'ARS Corse' },
  ],
  1069: [
    {
      label: 'Direction adjointe de la santé environnementale et de la veille sanitaire 2A',
      parentLabel: 'ARS Corse',
    },
  ],
  1071: [
    {
      label: 'Direction adjointe de la santé environnementale et de la veille sanitaire 2B',
      parentLabel: 'ARS Corse',
    },
  ],
  1051: [{ label: "Direction de l'Organisation des Soins", parentLabel: 'ARS Corse' }],
  1073: [{ label: 'Direction de la Santé Publique', parentLabel: 'ARS Corse' }],
  1049: [{ label: 'Direction de la Stratégie et de la Qualité', parentLabel: 'ARS Corse' }],
  1053: [{ label: 'Direction du Médico-Social', parentLabel: 'ARS Corse' }],
  1055: [{ label: 'Direction du Médico-social Personnes âgées', parentLabel: 'ARS Corse' }],
  1057: [{ label: 'Direction du Médico-Social Personnes handicapées', parentLabel: 'ARS Corse' }],
  1061: [{ label: 'MICEA', parentLabel: 'ARS Corse' }],
  1065: [{ label: 'Point Focal Régional', parentLabel: 'ARS Corse' }],
};
