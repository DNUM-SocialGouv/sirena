import { ROLES } from '@sirena/common/constants';
import { ARS_IDF_REG_LIB } from './entites.js';
import type { SeedConfig } from './types.js';

/** Default email when E2E_ENTITY_ADMIN_USER_1_EMAIL is not configured. */
const DEFAULT_E2E_ENTITY_ADMIN_EMAIL = 'user19@yopmail.com';

/**
 * Fixed DB id of that test user.
 */
export const E2E_ENTITY_ADMIN_ID = 'e2e-entity-admin-user19';

/** Constant faker seed: same generated data (names, dates, ids order) every run. */
export const E2E_FAKER_SEED = 20260916;

/** Manual requests per ARS: the full family set (one request per case family). */
const E2E_MANUAL_REQUETES_COUNT = 11;

/**
 * True when the seed must run the e2e profile, via `--e2e` or `SEED_PROFILE=e2e`.
 */
export const isE2eProfile = (): boolean => process.argv.includes('--e2e') || process.env.SEED_PROFILE === 'e2e';

/**
 * Static config for the e2e profile: reset, deterministic users (with a fixed
 * test user id), the full manual request set on both ARS (incl. shared
 * multi-entité requests), no DematSocial, feature flags on, constant faker seed.
 */
export const buildE2eSeedConfig = (): SeedConfig => {
  const email = process.env.E2E_ENTITY_ADMIN_USER_1_EMAIL ?? DEFAULT_E2E_ENTITY_ADMIN_EMAIL;

  return {
    reset: true,
    createUsers: true,
    customUsers:
      email === DEFAULT_E2E_ENTITY_ADMIN_EMAIL
        ? []
        : [{ email, role: ROLES.ENTITY_ADMIN, entiteRegLib: ARS_IDF_REG_LIB }],
    manualRequetesCount: E2E_MANUAL_REQUETES_COUNT,
    dematSocial: 'NONE',
    dematSocialFakeCount: 0,
    enableFeatureFlags: true,
    fakerSeed: E2E_FAKER_SEED,
    referenceDate: new Date('2026-09-16T12:00:00.000Z'),
    fixedUserIds: { [email]: E2E_ENTITY_ADMIN_ID },
  };
};
