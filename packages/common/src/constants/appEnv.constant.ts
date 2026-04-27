export const APP_ENVS = {
  LOCAL: 'local',
  INTEGRATION: 'integration',
  VALIDATION: 'validation',
  FORMATION: 'formation',
  PREPRODUCTION: 'preproduction',
  TEST: 'test',
  PRODUCTION: 'production',
} as const;

export type AppEnv = (typeof APP_ENVS)[keyof typeof APP_ENVS];

export const APP_ENV_VALUES = Object.values(APP_ENVS) as [AppEnv, ...AppEnv[]];

export const appEnvLabels: Record<AppEnv, string> = {
  [APP_ENVS.LOCAL]: 'local',
  [APP_ENVS.INTEGRATION]: 'intégration',
  [APP_ENVS.VALIDATION]: 'validation',
  [APP_ENVS.FORMATION]: 'formation',
  [APP_ENVS.PREPRODUCTION]: 'préproduction',
  [APP_ENVS.TEST]: 'test',
  [APP_ENVS.PRODUCTION]: 'production',
};
