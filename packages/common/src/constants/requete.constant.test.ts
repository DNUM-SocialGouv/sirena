import { describe, expect, it } from 'vitest';
import {
  AUTRE_PROFESSIONNEL_PRECISION,
  autreProfessionnelPrecisionLabels,
  LIEU_AUTRES_ETABLISSEMENTS_PRECISION,
  LIEU_TRAJET_PRECISION,
  LIEU_TYPE,
  lieuAutresEtablissementsPrecisionLabels,
  lieuTrajetPrecisionLabels,
  lieuTypeLabels,
  MALTRAITANCE_TYPE,
  MIS_EN_CAUSE_ETABLISSEMENT_PRECISION,
  MIS_EN_CAUSE_TYPE,
  maltraitanceTypeLabels,
  misEnCauseEtablissementPrecisionLabels,
  motifLabels,
  NON_SELECTABLE_AUTRE_PROFESSIONNEL_PRECISIONS,
  NON_SELECTABLE_LIEU_AUTRES_ETABLISSEMENTS_PRECISIONS,
  NON_SELECTABLE_LIEU_TRAJET_PRECISIONS,
  NON_SELECTABLE_LIEU_TYPES,
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
          PROBLEME_ORGANISATION_FONCTIONNEMENT:
            "Problème d'organisation ou de fonctionnement de l'établissement ou du service",
        }),
      );
    });

    it('exposes a generic maltraitance value so SIREC "Maltraitance" triggers the maltraitance tag', () => {
      expect(MALTRAITANCE_TYPE.AUTRE).toBe('AUTRE');
      expect(maltraitanceTypeLabels.AUTRE).toBe(
        "Maltraitance (action ou défaut d'action individuelle, collective ou institutionnelle)",
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

    it('keeps only "Autre" as a SIREC-only accused-party type after repositioning', () => {
      expect(MIS_EN_CAUSE_TYPE).not.toHaveProperty('ETABLISSEMENT_FICTIF');
      expect(MIS_EN_CAUSE_TYPE).not.toHaveProperty('MAISON_ARRET');
      expect(MIS_EN_CAUSE_TYPE).not.toHaveProperty('TRANSPORTEUR_SANITAIRE');
      expect(MIS_EN_CAUSE_TYPE.AUTRE).toBe('AUTRE');
      expect(NON_SELECTABLE_MIS_EN_CAUSE_TYPES).toEqual([MIS_EN_CAUSE_TYPE.AUTRE]);
    });

    it('repositions "Établissement fictif" as a non-selectable location type', () => {
      expect(LIEU_TYPE.ETABLISSEMENT_FICTIF).toBe('ETABLISSEMENT_FICTIF');
      expect(lieuTypeLabels.ETABLISSEMENT_FICTIF).toBe('Etablissement fictif');
      expect(NON_SELECTABLE_LIEU_TYPES).toEqual([LIEU_TYPE.ETABLISSEMENT_FICTIF]);
    });

    it('repositions "Maison d\'arrêt" and "Transporteur Sanitaire" as non-selectable location precisions', () => {
      expect(lieuAutresEtablissementsPrecisionLabels.MAISON_ARRET).toBe("Maison d'arrêt");
      expect(NON_SELECTABLE_LIEU_AUTRES_ETABLISSEMENTS_PRECISIONS).toEqual([
        LIEU_AUTRES_ETABLISSEMENTS_PRECISION.MAISON_ARRET,
      ]);
      expect(lieuTrajetPrecisionLabels.TRANSPORTEUR_SANITAIRE).toBe('Transporteur Sanitaire');
      expect(NON_SELECTABLE_LIEU_TRAJET_PRECISIONS).toEqual([LIEU_TRAJET_PRECISION.TRANSPORTEUR_SANITAIRE]);
    });

    it('repositions "Exercice illégal" as a non-selectable "Autre professionnel" precision', () => {
      expect(autreProfessionnelPrecisionLabels.EXERCICE_ILLEGAL).toBe('Exercice illégal');
      expect(NON_SELECTABLE_AUTRE_PROFESSIONNEL_PRECISIONS).toEqual([AUTRE_PROFESSIONNEL_PRECISION.EXERCICE_ILLEGAL]);
    });
  });
});
