import { describe, expect, it } from 'vitest';
import { formatPersonneConcerneeFromServer, formatPersonneConcerneeToServer } from './personneConcernee.js';

describe('personneConcernee formatters', () => {
  it('preserves the Mesure de protection between server data, form data, and API payload', () => {
    const formData = formatPersonneConcerneeFromServer({ mesureProtection: 'MANDATAIRE_FAMILIAL' });

    expect(formData.mesureProtection).toBe('MANDATAIRE_FAMILIAL');
    expect(formatPersonneConcerneeToServer(formData)).toMatchObject({
      mesureProtection: 'MANDATAIRE_FAMILIAL',
    });
  });
});
