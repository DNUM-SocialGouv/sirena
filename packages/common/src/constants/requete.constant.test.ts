import { describe, expect, it } from 'vitest';
import {
  MIS_EN_CAUSE_ETABLISSEMENT_PRECISION,
  MIS_EN_CAUSE_TYPE,
  MOTIF,
  misEnCauseEtablissementPrecisionLabels,
  misEnCauseTypeLabels,
  motifLabels,
  NON_SELECTABLE_MIS_EN_CAUSE_TYPES,
  NON_SELECTABLE_RECEPTION_TYPES,
  RECEPTION_TYPE,
  receptionTypeLabels,
} from './requete.constant.js';

describe('requete constants', () => {
  describe('establishment accused party precision referential', () => {
    it('exposes the new SAD precisions and removes the old generic service precision', () => {
      expect(MIS_EN_CAUSE_ETABLISSEMENT_PRECISION).toEqual(
        expect.objectContaining({
          SAD_MIXTE: 'SAD_MIXTE',
          SAD_SOINS: 'SAD_SOINS',
          SAD_AIDE: 'SAD_AIDE',
        }),
      );
      expect(misEnCauseEtablissementPrecisionLabels).toEqual(
        expect.objectContaining({
          SAD_MIXTE: 'SAD mixte',
          SAD_SOINS: 'SAD soins',
          SAD_AIDE: 'SAD aide',
        }),
      );
    });
  });

  describe('SIREC-only referential values', () => {
    it('exposes the declared motifs coming from SIREC migrations', () => {
      expect(motifLabels).toEqual(
        expect.objectContaining({
          DIFFICULTES_ACCES_SOINS: "Difficultés d'accès aux soins (établissement ou professionnel)",
          MALTRAITANCE: "Maltraitance (action ou défaut d'action individuelle, collective ou institutionnelle)",
          PROBLEME_ORGANISATION_FONCTIONNEMENT:
            "Problème d'organisation ou de fonctionnement de l'établissement ou du service",
        }),
      );
      expect(MOTIF).toEqual(
        expect.objectContaining({
          DIFFICULTES_ACCES_SOINS: 'DIFFICULTES_ACCES_SOINS',
          MALTRAITANCE: 'MALTRAITANCE',
          PROBLEME_ORGANISATION_FONCTIONNEMENT: 'PROBLEME_ORGANISATION_FONCTIONNEMENT',
        }),
      );
    });

    it('exposes the reception types coming from SIREC migrations and keeps them non-selectable', () => {
      expect(receptionTypeLabels).toEqual(
        expect.objectContaining({
          INFO_MEDIA: 'Info par média',
          PORTAIL_SIGNALEMENTS: 'Portail des signalements',
          SIGNAL_CONSO: 'Signal Conso',
        }),
      );
      expect(NON_SELECTABLE_RECEPTION_TYPES).toEqual([
        RECEPTION_TYPE.FORMULAIRE,
        RECEPTION_TYPE.INFO_MEDIA,
        RECEPTION_TYPE.PORTAIL_SIGNALEMENTS,
        RECEPTION_TYPE.SIGNAL_CONSO,
      ]);
    });

    it('exposes the accused-party types coming from SIREC migrations and keeps them non-selectable', () => {
      expect(misEnCauseTypeLabels).toEqual(
        expect.objectContaining({
          ETABLISSEMENT_FICTIF: 'Etablissement fictif',
          EXERCICE_ILLEGAL: 'Exercice illégal',
          MAISON_ARRET: "Maison d'arrêt",
          TRANSPORTEUR_SANITAIRE: 'Transporteur Sanitaire',
          AUTRE: 'Autre',
        }),
      );
      expect(NON_SELECTABLE_MIS_EN_CAUSE_TYPES).toEqual([
        MIS_EN_CAUSE_TYPE.ETABLISSEMENT_FICTIF,
        MIS_EN_CAUSE_TYPE.EXERCICE_ILLEGAL,
        MIS_EN_CAUSE_TYPE.MAISON_ARRET,
        MIS_EN_CAUSE_TYPE.TRANSPORTEUR_SANITAIRE,
        MIS_EN_CAUSE_TYPE.AUTRE,
      ]);
    });
  });
});
