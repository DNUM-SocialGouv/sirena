import {
  throwHTTPException400BadRequest,
  throwHTTPException503ServiceUnavailable,
} from '@sirena/backend-utils/helpers';
import { describe, expect, it, vi } from 'vitest';
import { fetchEsanteData, getPractionners } from './esante.service';

const logger = { warn: vi.fn(), error: vi.fn(), info: vi.fn() };

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
  BundlePractitionerSchema: {
    safeParse,
  },
}));

const fetchMock = vi.fn();
global.fetch = fetchMock;

describe('esante.service.ts', () => {
  describe('fetchEsanteData', () => {
    it('builds URL with query, sets headers, returns parsed data on 200', async () => {
      const body = { foo: 'bar' };
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => body,
      });

      // tell the schema mock what to return
      safeParse.mockReturnValueOnce({ success: true, data: body });

      const res = await fetchEsanteData('practitioners', { a: 'b', c: 'd' });
      expect(res).toEqual(body);
      expect(safeParse).toHaveBeenCalledWith(body);
    });

    it('throws 503 helper and logs warn on 503', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: vi.fn(), // not used
      });

      await expect(fetchEsanteData('ping', {})).rejects.toThrow(/503:/);

      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.error).not.toHaveBeenCalled();
      expect(throwHTTPException503ServiceUnavailable).toHaveBeenCalledTimes(1);
    });

    it('throws 400 helper and logs warn on 400', async () => {
      vi.clearAllMocks();
      const jsonSpy = vi.fn();
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: jsonSpy,
      });

      await expect(fetchEsanteData('practitioners', { a: '1' })).rejects.toThrow(/400:/);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(
        `https://esante.api/practitioners?${new URLSearchParams({ a: '1' }).toString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'ESANTE-API-KEY': '123',
          },
        },
      );

      expect(jsonSpy).not.toHaveBeenCalled();
      expect(safeParse).not.toHaveBeenCalled();

      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          err: 'Bad Request',
          url: expect.stringContaining('/practitioners'),
          status: 400,
        }),
        'Error fetching data from Esante API',
      );

      expect(logger.error).not.toHaveBeenCalled();

      expect(throwHTTPException400BadRequest).toHaveBeenCalledTimes(1);
      expect(throwHTTPException503ServiceUnavailable).not.toHaveBeenCalled();
    });

    it('logs error and throws 503 helper on unhandled status (e.g., 500)', async () => {
      vi.clearAllMocks();
      const jsonSpy = vi.fn();
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: jsonSpy,
      });

      await expect(fetchEsanteData('health', {})).rejects.toThrow(/503:/);

      expect(fetchMock).toHaveBeenCalledWith('https://esante.api/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'ESANTE-API-KEY': '123',
        },
      });

      expect(jsonSpy).not.toHaveBeenCalled();
      expect(safeParse).not.toHaveBeenCalled();

      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          err: 'Internal Server Error',
          url: 'https://esante.api/health',
          status: 500,
        }),
        'Error fetching data from Esante API',
      );

      expect(throwHTTPException400BadRequest).not.toHaveBeenCalled();
      expect(throwHTTPException503ServiceUnavailable).toHaveBeenCalledTimes(1);
    });
  });

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

      expect(logger.info).toHaveBeenCalledTimes(1);
      expect(logger.info).toHaveBeenCalledWith({ data: bundle });
      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });
  });
});
