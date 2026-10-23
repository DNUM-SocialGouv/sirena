import { describe, expect, it } from 'vitest';
import { FILTRE_NON_RENSEIGNE } from '../constants/filtreNonRenseigne.constant.js';
import { DOMAINES_FONCTIONNELS, LIEU_TYPE } from '../constants/requete.constant.js';
import { estNonRenseigne, separerNonRenseigne } from './filtreNonRenseigne.utils.js';

describe('separerNonRenseigne', () => {
  it('sépare la sentinelle des valeurs de référentiel', () => {
    expect(separerNonRenseigne(['SOCIAL', FILTRE_NON_RENSEIGNE, 'SANITAIRE'])).toEqual({
      valeurs: ['SOCIAL', 'SANITAIRE'],
      nonRenseigne: true,
    });
  });

  it("signale l'absence de la sentinelle sans toucher aux valeurs", () => {
    expect(separerNonRenseigne(['SOCIAL'])).toEqual({ valeurs: ['SOCIAL'], nonRenseigne: false });
  });

  it('reconnaît une sélection réduite à la seule sentinelle', () => {
    expect(separerNonRenseigne([FILTRE_NON_RENSEIGNE])).toEqual({ valeurs: [], nonRenseigne: true });
  });

  it('ne renvoie aucune valeur pour une sélection vide', () => {
    expect(separerNonRenseigne([])).toEqual({ valeurs: [], nonRenseigne: false });
  });
});

describe('estNonRenseigne', () => {
  it('ne reconnaît que la sentinelle exacte', () => {
    expect(estNonRenseigne(FILTRE_NON_RENSEIGNE)).toBe(true);
    expect(estNonRenseigne('non_renseigne')).toBe(false);
    expect(estNonRenseigne('SOCIAL')).toBe(false);
  });
});

// Si un identifiant du référentiel s'appelait un jour comme la sentinelle, cocher cette valeur
// réelle sélectionnerait les données non renseignées — silencieusement.
describe('la sentinelle ne collisionne avec aucun référentiel filtrable', () => {
  it('ne correspond à aucun domaine fonctionnel', () => {
    expect(Object.values(DOMAINES_FONCTIONNELS) as string[]).not.toContain(FILTRE_NON_RENSEIGNE);
  });

  it('ne correspond à aucun type de lieu de survenue', () => {
    expect(Object.values(LIEU_TYPE) as string[]).not.toContain(FILTRE_NON_RENSEIGNE);
  });
});
