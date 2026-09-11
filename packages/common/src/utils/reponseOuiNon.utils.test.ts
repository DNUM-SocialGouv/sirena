import { describe, expect, it } from 'vitest';
import { REPONSE_OUI_NON } from '../constants/reponseOuiNon.constant.js';
import type { ReponseOuiNonValue } from '../schemas/index.js';
import {
  booleanToReponseOuiNon,
  formatReponseOuiNon,
  isReponseOuiNonRenseignee,
  negateReponseOuiNon,
  reponseOuiNonToBoolean,
} from './reponseOuiNon.utils.js';

describe('formatReponseOuiNon', () => {
  it.each<[ReponseOuiNonValue, string | null]>([
    [REPONSE_OUI_NON.OUI, 'Oui'],
    [REPONSE_OUI_NON.NON, 'Non'],
    [REPONSE_OUI_NON.NON_RENSEIGNE, 'Non renseigné'],
    [null, null],
    [undefined, null],
  ])('formats %s as %s', (reponse, expected) => {
    expect(formatReponseOuiNon(reponse)).toBe(expected);
  });
});

describe('reponseOuiNonToBoolean', () => {
  it.each<[ReponseOuiNonValue, boolean | null]>([
    [REPONSE_OUI_NON.OUI, true],
    [REPONSE_OUI_NON.NON, false],
    [REPONSE_OUI_NON.NON_RENSEIGNE, null],
    [null, null],
    [undefined, null],
  ])('converts %s to %s', (reponse, expected) => {
    expect(reponseOuiNonToBoolean(reponse)).toBe(expected);
  });
});

describe('booleanToReponseOuiNon', () => {
  it.each<[boolean | null | undefined, string | null]>([
    [true, 'OUI'],
    [false, 'NON'],
    [null, null],
    [undefined, null],
  ])('converts %s to %s', (value, expected) => {
    expect(booleanToReponseOuiNon(value)).toBe(expected);
  });
});

describe('negateReponseOuiNon', () => {
  it.each<[ReponseOuiNonValue, string | null]>([
    [REPONSE_OUI_NON.OUI, 'NON'],
    [REPONSE_OUI_NON.NON, 'OUI'],
    [null, null],
    [undefined, null],
  ])('flips %s to %s', (reponse, expected) => {
    expect(negateReponseOuiNon(reponse)).toBe(expected);
  });

  it('leaves an explicit "Non renseigné" untouched', () => {
    expect(negateReponseOuiNon(REPONSE_OUI_NON.NON_RENSEIGNE)).toBe('NON_RENSEIGNE');
  });
});

describe('isReponseOuiNonRenseignee', () => {
  it.each<[ReponseOuiNonValue, boolean]>([
    [REPONSE_OUI_NON.OUI, true],
    [REPONSE_OUI_NON.NON, true],
    [REPONSE_OUI_NON.NON_RENSEIGNE, false],
    [null, false],
    [undefined, false],
  ])('returns %s for %s', (reponse, expected) => {
    expect(isReponseOuiNonRenseignee(reponse)).toBe(expected);
  });
});
