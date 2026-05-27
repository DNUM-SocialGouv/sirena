import { describe, expect, it } from 'vitest';
import { formatPersonneConcerneeFromServer, formatPersonneConcerneeToServer } from './personneConcernee.js';

describe('personneConcernee formatters', () => {
  it('preserves the Mesure de protection between server data, form data, and API payload', () => {
    const formData = formatPersonneConcerneeFromServer({ mesureProtection: 'HABILITATION_FAMILIALE' });

    expect(formData.mesureProtection).toBe('HABILITATION_FAMILIALE');
    expect(formatPersonneConcerneeToServer(formData)).toMatchObject({
      mesureProtection: 'HABILITATION_FAMILIALE',
    });
  });
});
