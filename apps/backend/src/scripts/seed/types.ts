import type { Role } from '@sirena/common/constants';

/**
 * Choice for the "DematSocial requests" block.
 */
export type DematSocialMode = 'FAKE' | 'REAL_IMPORT' | 'NONE';

/**
 * An extra user entered on the fly in the CLI.
 */
export type CustomUserInput = {
  email: string;
  role: Role;
  /** regLib of the ARS to attach, or null for no entity. */
  entiteRegLib: string | null;
};

/**
 * Prompt results: everything the seed needs to run.
 */
export type SeedConfig = {
  reset: boolean;
  createUsers: boolean;
  customUsers: CustomUserInput[];
  manualRequetesCount: number;
  dematSocial: DematSocialMode;
  dematSocialFakeCount: number;
  enableFeatureFlags: boolean;
  /** Faker seed for reproducible runs (--seed=<n> option), otherwise null. */
  fakerSeed: number | null;
};
