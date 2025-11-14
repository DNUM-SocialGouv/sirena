import { describe, expect, it, vi } from 'vitest';
import { getPractionners } from './esante.service';

const logger = { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() };

vi.mock('@/config/env', () => ({
  envVars: {
    ANNUAIRE_SANTE_API_KEY: '123',
    ANNUAIRE_SANTE_API_URL: 'https://esante.api',
  },
}));

vi.mock('@/libs/asyncLocalStorage', () => ({
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

vi.mock('./esante.schema', () => ({
  EsantePractitionerBundleSchema: {
    safeParse,
  },
}));

const fetchMock = vi.fn();
global.fetch = fetchMock;

describe('esante.service.ts', () => {
  describe('getPractionners', () => {
    it('calls Esante with _elements and maps bundle entries, skipping incomplete ones', async () => {
      vi.clearAllMocks();
      const bundle = {
        entry: [
          {
            resource: {
              name: [{ text: 'Dr Alice A', family: 'Alice', given: ['A'], prefix: ['Dr'] }],
              identifier: [{ value: '123' }],
            },
          },
          {
            resource: {
              name: [{ text: 'Dr Bob B', family: 'Bob', given: ['B'] }],
              identifier: [{ value: '456' }],
            },
          },
          { resource: { identifier: [{ value: '789' }] } },
          { resource: { name: [{ text: 'NoId' }] } },
        ],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => bundle,
      });

      safeParse.mockReturnValueOnce({ success: true, data: bundle });

      const params = {
        'given:contains': 'doe',
        identifier: 'test',
      };
      const res = await getPractionners(params);

      expect(res).toEqual([
        {
          fullName: 'Dr Alice A',
          firstName: 'Alice',
          lastName: 'A',
          prefix: 'Dr',
          rpps: '123',
        },
        {
          fullName: 'Dr Bob B',
          firstName: 'Bob',
          lastName: 'B',
          prefix: '',
          rpps: '456',
        },
      ]);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const calledInit = fetchMock.mock.calls[0][1] as RequestInit;

      expect(calledInit).toMatchObject({
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'ESANTE-API-KEY': '123',
        },
      });

      expect(safeParse).toHaveBeenCalledWith(bundle);

      expect(logger.debug).toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });
  });
});
