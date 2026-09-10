import { describe, expect, it, vi } from 'vitest';
import { getOrganizations, getPractionners } from './esante.service.js';

const logger = { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() };

vi.mock('../../config/env.js', () => ({
  envVars: {
    ANNUAIRE_SANTE_API_KEY: '123',
    ANNUAIRE_SANTE_API_URL: 'https://esante.api',
  },
}));

vi.mock('../../libs/asyncLocalStorage.js', () => ({
  getLoggerStore: vi.fn(() => logger),
}));

vi.mock('@sirena/backend-utils/helpers', () => ({
  throwHTTPException400BadRequest: vi.fn((msg?: string) => {
    throw new Error(`400:${msg ?? ''}`);
  }),
  throwHTTPException503ServiceUnavailable: vi.fn((msg?: string) => {
    throw new Error(`503:${msg ?? ''}`);
  }),
}));

const { safeParse } = vi.hoisted(() => ({
  safeParse: vi.fn(),
}));

vi.mock('./esante.schema.js', () => ({
  EsantePractitionerBundleSchema: { safeParse },
  EsanteOrganizationBundleSchema: { safeParse },
}));

const fetchMock = vi.fn();
global.fetch = fetchMock;

// Identifiers as the ANS FHIR API actually returns them: the national id
// (IDNPS/IDNST) is prefixed with a type digit, the real RPPS/FINESS is another
// entry. See SIRENA-723.
const rppsIdentifiers = (rpps: string) => [
  { value: `8${rpps}`, system: 'urn:oid:1.2.250.1.71.4.2.1', type: { coding: [{ code: 'IDNPS' }] } },
  { value: rpps, system: 'https://rpps.esante.gouv.fr', type: { coding: [{ code: 'RPPS' }] } },
];
const finessIdentifiers = (finess: string) => [
  { value: `1${finess}`, system: 'urn:oid:1.2.250.1.71.4.2.2', type: { coding: [{ code: 'IDNST' }] } },
  { value: finess, system: 'https://finess.esante.gouv.fr', type: { coding: [{ code: 'FINEG' }] } },
];

describe('esante.service.ts', () => {
  describe('getPractionners', () => {
    it('selects the RPPS identifier (not the prefixed IDNPS) and skips incomplete entries', async () => {
      vi.clearAllMocks();
      const bundle = {
        entry: [
          {
            resource: {
              name: [{ text: 'Dr Alice A', family: 'Alice', given: ['A'], prefix: ['Dr'] }],
              identifier: rppsIdentifiers('10000509124'),
            },
          },
          {
            // Only the RPPS system, no type coding: still selected via system fallback.
            resource: {
              name: [{ text: 'Dr Bob B', family: 'Bob', given: ['B'] }],
              identifier: [{ value: '10000509125', system: 'https://rpps.esante.gouv.fr' }],
            },
          },
          {
            // Only the prefixed IDNPS, no real RPPS: skipped rather than stored wrong.
            resource: {
              name: [{ text: 'Dr Carol C', family: 'Carol', given: ['C'] }],
              identifier: [{ value: '810000509126', type: { coding: [{ code: 'IDNPS' }] } }],
            },
          },
          { resource: { name: [{ text: 'NoId' }] } },
        ],
      };

      fetchMock.mockResolvedValueOnce({ ok: true, status: 200, statusText: 'OK', json: async () => bundle });
      safeParse.mockReturnValueOnce({ success: true, data: bundle });

      const res = await getPractionners({ identifier: '10000509124' });

      expect(res).toEqual([
        { fullName: 'Dr Alice A', firstName: 'A', lastName: 'Alice', prefix: 'Dr', rpps: '10000509124' },
        { fullName: 'Dr Bob B', firstName: 'B', lastName: 'Bob', prefix: '', rpps: '10000509125' },
      ]);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const calledInit = fetchMock.mock.calls[0][1] as RequestInit;
      expect(calledInit).toMatchObject({
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'ESANTE-API-KEY': '123' },
      });
      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });
  });

  describe('getOrganizations', () => {
    it('selects the FINESS identifier (not the prefixed IDNST) and skips incomplete entries', async () => {
      vi.clearAllMocks();
      const bundle = {
        entry: [
          {
            resource: {
              name: 'SIMETRA',
              identifier: finessIdentifiers('640022190'),
              address: [{ postalCode: '64200', city: 'BIARRITZ' }],
            },
          },
          {
            // Only the FINESS system, no type coding: still selected via system fallback.
            resource: {
              name: 'CLINIQUE',
              identifier: [{ value: '640022191', system: 'https://finess.esante.gouv.fr' }],
              address: [{ postalCode: '64000', city: 'PAU' }],
            },
          },
          {
            // Only the prefixed IDNST, no real FINESS: skipped.
            resource: {
              name: 'STRUCTURE',
              identifier: [{ value: '1640022192', type: { coding: [{ code: 'IDNST' }] } }],
            },
          },
          { resource: { identifier: finessIdentifiers('640022193') } },
        ],
      };

      fetchMock.mockResolvedValueOnce({ ok: true, status: 200, statusText: 'OK', json: async () => bundle });
      safeParse.mockReturnValueOnce({ success: true, data: bundle });

      const res = await getOrganizations({ identifier: '640022190' });

      expect(res).toEqual([
        { name: 'SIMETRA', identifier: '640022190', addressPostalcode: '64200', addressCity: 'BIARRITZ' },
        { name: 'CLINIQUE', identifier: '640022191', addressPostalcode: '64000', addressCity: 'PAU' },
      ]);

      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });
  });
});
