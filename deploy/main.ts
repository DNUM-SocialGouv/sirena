import { App as CdkApp, YamlOutputType } from 'cdk8s';
import { App, Worker } from './charts/app';
import { CustomIssuer } from './charts/cert-issuer';
import { ExternalSecrets } from './charts/external-secrets';
import { PodMonitor } from './charts/pod-monitor';
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
  has_custom_issuer: boolean;
  technical_fqdn?: string;
  use_managed_redis: boolean;
  pc_domain: string;
}

const ENV_CONFIGS: Record<string, EnvironmentConfig> = {
  integration: {
    subdomain: 'sirena.integration',
    domain: 'dev.atlas.fabrique.social.gouv.fr',
    replicas: COMMON_CONFIG.resources.dev.replicas,
    has_custom_issuer: false,
    use_managed_redis: false,
    pc_domain: 'https://fca.integ01.dev-agentconnect.fr/api/v2',
  },
  test: {
    subdomain: 'sirena.test',
    domain: 'dev.atlas.fabrique.social.gouv.fr',
    replicas: COMMON_CONFIG.resources.dev.replicas,
    has_custom_issuer: false,
    use_managed_redis: false,
    pc_domain: 'https://fca.integ01.dev-agentconnect.fr/api/v2',
  },
  validation: {
    subdomain: 'sirena.validation',
    domain: 'dev.atlas.fabrique.social.gouv.fr',
    replicas: COMMON_CONFIG.resources.dev.replicas,
    has_custom_issuer: false,
    use_managed_redis: false,
    pc_domain: 'https://fca.integ01.dev-agentconnect.fr/api/v2',
  },
  formation: {
    subdomain: 'sirena.formation',
    domain: 'prod.atlas.fabrique.social.gouv.fr',
    replicas: COMMON_CONFIG.resources.prod.replicas,
    has_custom_issuer: false,
    use_managed_redis: true,
    pc_domain: 'https://auth.agentconnect.gouv.fr/api/v2',
  },
  preproduction: {
    subdomain: 'sirena.preproduction',
    domain: 'prod.atlas.fabrique.social.gouv.fr',
    replicas: COMMON_CONFIG.resources.prod.replicas,
    has_custom_issuer: false,
    use_managed_redis: true,
    pc_domain: 'https://auth.agentconnect.gouv.fr/api/v2',
  },
  production: {
    subdomain: 'sirena-sante',
    domain: 'social.gouv.fr',
    replicas: COMMON_CONFIG.resources.prod.replicas,
    has_custom_issuer: true,
    technical_fqdn: 'sirena-sante.social.prod.atlas.fabrique.social.gouv.fr',
    use_managed_redis: true,
    pc_domain: 'https://auth.agentconnect.gouv.fr/api/v2',
  },
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
  new ExternalSecrets(app, 'external-secrets', environnement, envConfig.use_managed_redis);

  if (!envConfig.use_managed_redis) {
    // Redis
    new RedisChart(app, 'redis', {
      namespace,
    });
  }

  // Worker
  new Worker(app, {
    name: 'worker',
    replicas: envConfig.replicas,
    image: `${COMMON_CONFIG.imageRegistry}:${imageTag}-worker`,
    namespace,
    environment,
    host: '',
    use_managed_redis: envConfig.use_managed_redis,
    has_custom_certificate: envConfig.has_custom_issuer,
    pc_domain: envConfig.pc_domain,
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
    use_managed_redis: envConfig.use_managed_redis,
    has_custom_certificate: envConfig.has_custom_issuer,
    ...(envConfig.technical_fqdn ? { technical_fqdn: envConfig.technical_fqdn } : {}),
    pc_domain: envConfig.pc_domain,
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
    use_managed_redis: envConfig.use_managed_redis,
    has_custom_certificate: envConfig.has_custom_issuer,
    ...(envConfig.technical_fqdn ? { technical_fqdn: envConfig.technical_fqdn } : {}),
    pc_domain: envConfig.pc_domain,
  });

  // PodMonitors for VictoriaMetrics
  new PodMonitor(app, 'backend-pod-monitor', {
    namespace,
    appName: 'backend',
    port: 'monitoring',
    path: '/metrics',
  });

  new PodMonitor(app, 'worker-pod-monitor', {
    namespace,
    appName: 'worker',
    port: 'monitoring',
    path: '/metrics',
  });

  if (ENV_CONFIGS[environnement].has_custom_issuer) {
    new CustomIssuer(app, 'certigna');
  }
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
