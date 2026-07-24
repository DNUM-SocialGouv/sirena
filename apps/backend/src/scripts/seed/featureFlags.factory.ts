import { FEATURE_FLAGS } from '@sirena/common/constants';
import { prisma } from '../../libs/prisma.js';

/**
 * Enables every known feature flag locally, idempotent by name, so features
 * gated behind a flag are visible without touching the DB by hand.
 */
export const seedFeatureFlags = async (): Promise<string[]> => {
  const names = Object.values(FEATURE_FLAGS);

  for (const name of names) {
    await prisma.featureFlag.upsert({
      where: { name },
      update: { enabled: true },
      create: { name, enabled: true, description: 'Enabled by seed CLI' },
    });
  }

  return names;
};
