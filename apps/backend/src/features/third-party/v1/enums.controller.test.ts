import type { Context, Next } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../../helpers/errors.js';
import appWithLogs from '../../../helpers/factories/appWithLogs.js';
import EnumsController from './enums.controller.js';
import {
  getAgeEnums,
  getAutoriteTypeEnums,
  getCiviliteEnums,
  getConsequenceEnums,
  getDemarcheEnums,
  getLienVictimeEnums,
  getLieuTypeEnums,
  getMaltraitanceTypeEnums,
  getMisEnCausePrecisionsTypeEnums,
  getMisEnCauseTypeEnums,
  getMotifDeclaratifEnums,
} from './enums.service.js';

vi.mock('./enums.service.js', () => ({
  getAgeEnums: vi.fn(),
  getAutoriteTypeEnums: vi.fn(),
  getCiviliteEnums: vi.fn(),
  getConsequenceEnums: vi.fn(),
  getDemarcheEnums: vi.fn(),
  getLienVictimeEnums: vi.fn(),
  getLieuTypeEnums: vi.fn(),
  getMaltraitanceTypeEnums: vi.fn(),
  getMisEnCausePrecisionsTypeEnums: vi.fn(),
  getMisEnCauseTypeEnums: vi.fn(),
  getMotifDeclaratifEnums: vi.fn(),
}));

const logger = { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() };

const app = appWithLogs
  .createApp()
  .use((c: Context, next: Next) => {
    c.set('logger', logger);
    return next();
  })
  .route('/', EnumsController)
  .onError(errorHandler);

const dbEnum = [
  { id: 'A', label: 'Libellé A' },
  { id: 'B', label: 'Libellé B' },
];
const keyValueEnum = [{ key: 'A', value: 'Libellé A' }];

describe('third-party v1 enums.controller.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ['/age', getAgeEnums],
    ['/civilite', getCiviliteEnums],
    ['/lien-victime', getLienVictimeEnums],
    ['/motif-declaratif', getMotifDeclaratifEnums],
    ['/consequence', getConsequenceEnums],
    ['/autorite-type', getAutoriteTypeEnums],
    ['/demarche', getDemarcheEnums],
    ['/maltraitance-type', getMaltraitanceTypeEnums],
  ] as const)('GET %s returns the referential from the database', async (path, serviceFn) => {
    vi.mocked(serviceFn).mockResolvedValueOnce(dbEnum);

    const res = await app.request(path);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(dbEnum);
    expect(serviceFn).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['/mis-en-cause-type', getMisEnCauseTypeEnums],
    ['/lieu-type', getLieuTypeEnums],
  ] as const)('GET %s returns the static referential', async (path, serviceFn) => {
    vi.mocked(serviceFn).mockReturnValueOnce(keyValueEnum);

    const res = await app.request(path);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(keyValueEnum);
  });

  it('GET /mis-en-cause-precisions returns precisions grouped by profession kind', async () => {
    const precisions = { profession: keyValueEnum, professionDomicile: keyValueEnum };
    vi.mocked(getMisEnCausePrecisionsTypeEnums).mockReturnValueOnce(precisions);

    const res = await app.request('/mis-en-cause-precisions');

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(precisions);
  });

  it('returns 500 when the database fails', async () => {
    vi.mocked(getAgeEnums).mockRejectedValueOnce(new Error('db down'));

    const res = await app.request('/age');

    expect(res.status).toBe(500);
  });
});
