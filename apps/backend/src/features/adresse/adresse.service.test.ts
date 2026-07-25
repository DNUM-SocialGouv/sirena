import { beforeEach, describe, expect, it, vi } from 'vitest';
import { searchAddresses } from './adresse.service.js';

const logger = { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() };

vi.mock('../../config/env.js', () => ({
  envVars: {
    ADDRESS_API_URL: 'https://ban.api',
  },
}));

vi.mock('../../libs/asyncLocalStorage.js', () => ({
  getLoggerStore: vi.fn(() => logger),
}));

const fetchMock = vi.fn();
global.fetch = fetchMock;

const feature = (properties: Record<string, unknown>) => ({ properties });

describe('adresse.service.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps BAN features and skips those missing type or label', async () => {
    const collection = {
      type: 'FeatureCollection',
      features: [
        feature({
          id: '92012',
          type: 'municipality',
          name: 'Boulogne-Billancourt',
          postcode: '92100',
          citycode: '92012',
          city: 'Boulogne-Billancourt',
          context: '92, Hauts-de-Seine',
          label: 'Boulogne-Billancourt',
        }),
        feature({
          id: '77018_0120_00008',
          type: 'housenumber',
          name: '8 Rue de Magny',
          postcode: '77700',
          citycode: '77018',
          city: 'Bailly-Romainvilliers',
          context: '77, Seine-et-Marne',
          label: '8 Rue de Magny 77700 Bailly-Romainvilliers',
        }),
        feature({ type: 'street', label: '' }),
        feature({ label: 'No type here' }),
      ],
    };

    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => collection });

    const res = await searchAddresses('boulogne');

    expect(res).toEqual([
      {
        id: '92012',
        label: 'Boulogne-Billancourt',
        type: 'municipality',
        name: 'Boulogne-Billancourt',
        postcode: '92100',
        citycode: '92012',
        city: 'Boulogne-Billancourt',
        context: '92, Hauts-de-Seine',
      },
      {
        id: '77018_0120_00008',
        label: '8 Rue de Magny 77700 Bailly-Romainvilliers',
        type: 'housenumber',
        name: '8 Rue de Magny',
        postcode: '77700',
        citycode: '77018',
        city: 'Bailly-Romainvilliers',
        context: '77, Seine-et-Marne',
      },
    ]);

    const [calledUrl, calledInit] = fetchMock.mock.calls[0];
    expect(calledUrl).toContain('https://ban.api/search/?');
    expect(calledUrl).toContain('q=boulogne');
    expect(calledUrl).toContain('autocomplete=1');
    expect(calledUrl).toContain('limit=10');
    expect(calledInit).toMatchObject({ method: 'GET' });
  });

  it('throws a 503 when the response does not match the BAN schema', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ features: 'not-an-array' }) });

    await expect(searchAddresses('paris')).rejects.toMatchObject({ status: 503 });
    expect(logger.error).toHaveBeenCalled();
  });

  it('throws a 400 when the BAN returns a bad request', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({}) });

    await expect(searchAddresses('a')).rejects.toMatchObject({ status: 400 });
  });

  it('throws a 503 when the BAN returns an upstream error', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });

    await expect(searchAddresses('paris')).rejects.toMatchObject({ status: 503 });
  });

  it('throws a 503 when the request fails at the network level', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'));

    await expect(searchAddresses('paris')).rejects.toMatchObject({ status: 503 });
  });
});
