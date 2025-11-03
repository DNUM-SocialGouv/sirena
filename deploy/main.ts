import { App as CdkApp, YamlOutputType } from 'cdk8s';
import { App, Worker } from './charts/app';
import { ExternalSecrets } from './charts/external-secrets';
import { MigrationJob } from './charts/migration-job';
import { RedisChart } from './charts/redis';
import * as k8s from './imports/k8s';

if (!process.env.IMAGE_TAG) {
  console.error('IMAGE_TAG non défini');
  process.exit(1);
}
if (!process.env.ENVIRONNEMENT) {
  console.error('ENVIRONNEMENT non défini');
  process.exit(1);
}
const imageTag: string = process.env.IMAGE_TAG;
const environnement: string = process.env.ENVIRONNEMENT;
const dbResetEnabled: string = process.env.DB_RESET_ENABLED || 'false';

// Common configuration values
const COMMON_CONFIG = {
  port: 80,
  imageRegistry: 'ghcr.io/dnum-socialgouv/sirena',
  resources: {
    dev: { replicas: 1 },
    prod: { replicas: 2 },
  },
  targetPorts: {
    backend: k8s.IntOrString.fromNumber(4000),
    frontend: k8s.IntOrString.fromNumber(8080),
  },
} as const;

// Environment-specific configuration
interface EnvironmentConfig {
  subdomain: string;
  domain: string;
  replicas: number;
  dbResetEnabled: string;
}

const ENV_CONFIGS: Record<string, EnvironmentConfig> = {
  integration: {
    subdomain: 'sirena.integration',
    domain: 'dev.atlas.fabrique.social.gouv.fr',
    replicas: COMMON_CONFIG.resources.dev.replicas,
    dbResetEnabled,
  },
  test: {
    subdomain: 'sirena.test',
    domain: 'dev.atlas.fabrique.social.gouv.fr',
    replicas: COMMON_CONFIG.resources.dev.replicas,
    dbResetEnabled,
  },
  validation: {
    subdomain: 'sirena.validation',
    domain: 'dev.atlas.fabrique.social.gouv.fr',
    replicas: COMMON_CONFIG.resources.dev.replicas,
    dbResetEnabled,
  },
  preproduction: {
    subdomain: 'sirena.preproduction',
    domain: 'prod.atlas.fabrique.social.gouv.fr',
    replicas: COMMON_CONFIG.resources.prod.replicas,
    dbResetEnabled,
  },
  // production: {
  //   subdomain: "sirena",
  //   domain: "prod.atlas.fabrique.social.gouv.fr",
  //   replicas: COMMON_CONFIG.resources.prod.replicas,
  // },
};

// Helper functions
function getHostUrl(envConfig: EnvironmentConfig): string {
  return `https://${envConfig.subdomain}.${envConfig.domain}`;
}

function createApps(
  app: CdkApp,
  envConfig: EnvironmentConfig,
  imageTag: string,
  namespace: string,
  environment: string,
): void {
  const hostUrl = getHostUrl(envConfig);

  // External secrets (database and backend secrets)
  new ExternalSecrets(app, 'external-secrets', environnement);

  // Redis
  new RedisChart(app, 'redis', {
    namespace,
  });

  // Database migrations
  new MigrationJob(app, {
    name: 'backend',
    image: `${COMMON_CONFIG.imageRegistry}:${imageTag}-backend`,
    namespace,
    environment,
    dbResetEnabled: envConfig.dbResetEnabled,
  });

  // Worker
  new Worker(app, {
    name: 'worker',
    replicas: envConfig.replicas,
    image: `${COMMON_CONFIG.imageRegistry}:${imageTag}-worker`,
    namespace,
    environment,
    host: '',
  });

  // Backend
  new App(app, 'backend', {
    name: 'backend',
    host: hostUrl,
    replicas: envConfig.replicas,
    port: COMMON_CONFIG.port,
    targetPort: COMMON_CONFIG.targetPorts.backend,
    image: `${COMMON_CONFIG.imageRegistry}:${imageTag}-backend`,
    namespace,
    environment,
  });

  // Frontend
  new App(app, 'frontend', {
    name: 'frontend',
    host: hostUrl,
    replicas: envConfig.replicas,
    port: COMMON_CONFIG.port,
    targetPort: COMMON_CONFIG.targetPorts.frontend,
    image: `${COMMON_CONFIG.imageRegistry}:${imageTag}-frontend`,
    namespace,
    environment,
  });
}

const app = new CdkApp({
  yamlOutputType: YamlOutputType.FOLDER_PER_CHART_FILE_PER_RESOURCE,
});

// Deploy applications based on environment
const envConfig = ENV_CONFIGS[environnement];
if (!envConfig) {
  console.error(`Environnement non supporté: ${environnement}`);
  console.error(`Environnements supportés: ${Object.keys(ENV_CONFIGS).join(', ')}`);
  process.exit(1);
}

const namespace = `org-sdpsn-ws-sirena-${environnement}`;
createApps(app, envConfig, imageTag, namespace, environnement);

app.synth();
