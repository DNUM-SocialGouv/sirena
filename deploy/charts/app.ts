import { Chart } from 'cdk8s';
import type { Construct } from 'constructs';
import * as k8s from '../imports/k8s';

interface SharedProps {
  name: string;
  image: string;
  replicas: number;
  namespace: string;
  environment: string;
}
interface AppProps extends SharedProps {
  host: string;
  port: number;
  targetPort: k8s.IntOrString;
}

interface WorkerProps extends SharedProps {
  host: '';
}

function createBackendEnvVars(host: string, environment: string): k8s.EnvVar[] {
  return [
    {
      name: 'HOST',
      value: host,
    },
    {
      name: 'LOG_FORMAT',
      value: 'json',
    },
    {
      name: 'PC_DOMAIN',
      value: 'https://fca.integ01.dev-agentconnect.fr/api/v2',
    },
    {
      name: 'PC_REDIRECT_URI',
      value: `${host}/api/auth/callback`,
    },
    {
      name: 'PC_ID_TOKEN_SIGNED_RESPONSE_ALG',
      value: 'RS256',
    },
    {
      name: 'PC_USERINFO_SIGNED_RESPONSE_ALG',
      value: 'RS256',
    },
    {
      name: 'AUTH_TOKEN_NAME',
      value: 'auth_token',
    },
    {
      name: 'REFRESH_TOKEN_NAME',
      value: 'refresh_token',
    },
    {
      name: 'IS_LOGGED_TOKEN_NAME',
      value: 'is_logged_token',
    },
    {
      name: 'AUTH_TOKEN_EXPIRATION',
      value: '600',
    },
    {
      name: 'REFRESH_TOKEN_EXPIRATION',
      value: '86400',
    },
    {
      name: 'FRONTEND_REDIRECT_URI',
      value: `${host}/home`,
    },
    {
      name: 'FRONTEND_REDIRECT_LOGIN_URI',
      value: `${host}/login`,
    },
    {
      name: 'FRONTEND_URI',
      value: host,
    },
    {
      name: 'DEMAT_SOCIAL_API_URL',
      value: 'https://demat.social.gouv.fr/api/v2/graphql ',
    },
    {
      name: 'DEMAT_SOCIAL_API_DIRECTORY',
      value: '798',
    },
    {
      name: 'SENTRY_ENABLED',
      value: 'true',
    },
    {
      name: 'SENTRY_ENVIRONMENT',
      value: environment,
    },
    {
      name: 'MONITORING_PORT',
      value: '9090',
    },
    {
      name: 'SARBACANE_API_URL',
      value: 'https://api.sarbacane.com/sendkit',
    },
    {
      name: 'S3_BUCKET_ENDPOINT',
      value: 's3.gra.io.cloud.ovh.net',
    },
    {
      name: 'S3_BUCKET_ROOT_DIR',
      value: '',
    },
    {
      name: 'S3_BUCKET_PORT',
      value: '443',
    },
    {
      name: 'CRON_DEMAT_SOCIAL',
      value: '300',
    },
    { name: 'DEMAT_SOCIAL_INSTRUCTEUR_ID', value: 'Instructeur-1166' },
    {
      name: 'ANNUAIRE_SANTE_API_URL',
      value: 'https://gateway.api.esante.gouv.fr/fhir/v2',
    },
  ];
}

function createDatabaseEnvVars(): k8s.EnvVar[] {
  const dbSecretName = 'db';
  const dbEnvMappings = [
    { envName: 'PG_SIRENA_DB', secretKey: 'dbname' },
    { envName: 'PG_SIRENA_USER', secretKey: 'username' },
    { envName: 'PG_SIRENA_PASSWORD', secretKey: 'password' },
    { envName: 'PG_PORT', secretKey: 'port' },
    { envName: 'PG_HOST', secretKey: 'host' },
    { envName: 'PG_URL', secretKey: 'url' },
  ];

  return dbEnvMappings.map(({ envName, secretKey }) => ({
    name: envName,
    valueFrom: {
      secretKeyRef: {
        name: dbSecretName,
        key: secretKey,
      },
    },
  }));
}

function createBucketEnvVars(): k8s.EnvVar[] {
  const dbSecretName = 'buckets';
  const dbEnvMappings = [
    { envName: 'S3_BUCKET_ACCESS_KEY', secretKey: 'accessKey' },
    { envName: 'S3_BUCKET_NAME', secretKey: 'name' },
    { envName: 'S3_BUCKET_SECRET_KEY', secretKey: 'secretKey' },
  ];

  return dbEnvMappings.map(({ envName, secretKey }) => ({
    name: envName,
    valueFrom: {
      secretKeyRef: {
        name: dbSecretName,
        key: secretKey,
      },
    },
  }));
}

function createRedisEnvVars(): k8s.EnvVar[] {
  return [
    {
      name: 'REDIS_HOST',
      value: 'redis-master',
    },
    {
      name: 'REDIS_PORT',
      value: '6379',
    },
    {
      name: 'REDIS_URL',
      value: 'redis://redis-master:6379',
    },
  ];
}

function createContainer(props: AppProps): k8s.Container {
  const isBackend = props.name === 'backend';
  const containerPort = Number(props.targetPort.value);

  const ports = [{ containerPort, name: 'http' }];
  if (isBackend) {
    ports.push({ containerPort: 9090, name: 'monitoring' });
  }

  return {
    name: props.name,
    resources: {
      limits: {
        cpu: k8s.Quantity.fromString('250m'),
        memory: k8s.Quantity.fromString('750Mi'),
      },
      requests: {
        cpu: k8s.Quantity.fromString('250m'),
        memory: k8s.Quantity.fromString('750Mi'),
      },
    },
    image: props.image,
    ports,
    env: isBackend
      ? [
          ...createBackendEnvVars(props.host, props.environment),
          ...createDatabaseEnvVars(),
          ...createRedisEnvVars(),
          ...createBucketEnvVars(),
        ]
      : [],
    envFrom: isBackend ? [{ secretRef: { name: 'backend' } }] : undefined,
    livenessProbe: {
      httpGet: {
        path: isBackend ? '/version' : '/',
        port: k8s.IntOrString.fromNumber(containerPort),
        scheme: 'HTTP',
      },
      initialDelaySeconds: 30,
      periodSeconds: 30,
      timeoutSeconds: 5,
      failureThreshold: 3,
    },
    ...(isBackend
      ? {
          readinessProbe: {
            httpGet: {
              path: '/health',
              port: k8s.IntOrString.fromNumber(containerPort),
              scheme: 'HTTP',
            },
            initialDelaySeconds: 10,
            periodSeconds: 10,
            timeoutSeconds: 5,
            failureThreshold: 3,
          },
        }
      : {}),
  };
}

function createIngressAnnotations(isBackend: boolean, namespace: string): Record<string, string> {
  const baseAnnotations = {
    'cert-manager.io/cluster-issuer': 'letsencrypt-http01',
    'nginx.ingress.kubernetes.io/proxy-body-size': '60m',
  };

  if (isBackend) {
    return {
      ...baseAnnotations,
      'nginx.ingress.kubernetes.io/use-regex': 'true',
      'nginx.ingress.kubernetes.io/rewrite-target': '/$1',
    };
  }

  console.log(`namespace: ${namespace}`);

  return {
    ...baseAnnotations,
    'nginx.ingress.kubernetes.io/custom-headers': `${namespace}/security-headers`,
  };
}

function createConfigMap(scope: Construct, isBackend: boolean) {
  if (!isBackend) {
    return new k8s.KubeConfigMap(scope, 'security-headers', {
      metadata: {
        name: 'security-headers',
      },
      data: {
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'X-Robots-Tag': 'noindex, nofollow, nosnippet, noarchive',
        'Content-Security-Policy':
          "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'",
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      },
    });
  }
  return undefined;
}

function createDeployment(scope: Construct, props: AppProps, labels: Record<string, string>) {
  const isBackend = props.name === 'backend';

  const initContainers = isBackend
    ? [
        {
          name: 'migration',
          image: props.image,
          workingDir: '/app',
          command: ['pnpm', '--filter', '@sirena/backend', 'db:deploy'],
          resources: {
            limits: {
              cpu: k8s.Quantity.fromString('250m'),
              memory: k8s.Quantity.fromString('500Mi'),
            },
            requests: {
              cpu: k8s.Quantity.fromString('100m'),
              memory: k8s.Quantity.fromString('256Mi'),
            },
          },
          env: createDatabaseEnvVars(),
        },
      ]
    : undefined;

  return new k8s.KubeDeployment(scope, 'deployment', {
    metadata: {
      name: props.name,
      labels: labels,
    },
    spec: {
      replicas: props.replicas,
      selector: {
        matchLabels: labels,
      },
      template: {
        metadata: {
          labels: labels,
        },
        spec: {
          initContainers,
          containers: [createContainer(props)],
          imagePullSecrets: [
            {
              name: 'ghcr-registry',
            },
          ],
        },
      },
    },
  });
}

function createWorkerDeployment(scope: Construct, props: WorkerProps, labels: Record<string, string>) {
  return new k8s.KubeDeployment(scope, 'worker-deployment', {
    metadata: {
      name: props.name,
      labels: labels,
    },
    spec: {
      replicas: props.replicas,
      selector: {
        matchLabels: labels,
      },
      template: {
        metadata: {
          labels: labels,
        },
        spec: {
          containers: [
            {
              name: props.name,
              image: props.image,
              ports: [{ containerPort: 9090, name: 'monitoring' }],
              resources: {
                limits: {
                  cpu: k8s.Quantity.fromString('250m'),
                  memory: k8s.Quantity.fromString('750Mi'),
                },
                requests: {
                  cpu: k8s.Quantity.fromString('250m'),
                  memory: k8s.Quantity.fromString('750Mi'),
                },
              },
              env: [
                ...createBackendEnvVars('', props.environment),
                ...createDatabaseEnvVars(),
                ...createRedisEnvVars(),
                ...createBucketEnvVars(),
              ],
              envFrom: [{ secretRef: { name: 'backend' } }],
            },
          ],
          imagePullSecrets: [
            {
              name: 'ghcr-registry',
            },
          ],
        },
      },
    },
  });
}

function createService(scope: Construct, props: AppProps, labels: Record<string, string>) {
  const isBackend = props.name === 'backend';

  const ports = [{ port: props.port, targetPort: props.targetPort, name: 'http' }];

  if (isBackend) {
    ports.push({
      port: 9090,
      targetPort: k8s.IntOrString.fromNumber(9090),
      name: 'monitoring',
    });
  }

  return new k8s.KubeService(scope, 'service', {
    metadata: {
      name: props.name,
      labels,
    },
    spec: {
      type: 'ClusterIP',
      selector: labels,
      ports,
    },
  });
}

function createIngress(
  scope: Construct,
  props: AppProps,
  isBackend: boolean,
  namespace: string,
  service: k8s.KubeService,
) {
  return new k8s.KubeIngress(scope, 'ingress', {
    metadata: {
      name: props.name,
      annotations: createIngressAnnotations(isBackend, namespace),
    },
    spec: {
      ingressClassName: 'public',
      rules: [
        {
          host: props.host.replace('https://', ''),
          http: {
            paths: [
              {
                pathType: isBackend ? 'ImplementationSpecific' : 'Prefix',
                path: isBackend ? '/api/(.*)' : '/',
                backend: {
                  service: {
                    name: service.name,
                    port: {
                      number: props.port,
                    },
                  },
                },
              },
            ],
          },
        },
      ],
      tls: [
        {
          hosts: [props.host.replace('https://', '')],
          secretName: 'frontend-tls',
        },
      ],
    },
  });
}

export class App extends Chart {
  constructor(scope: Construct, id: string, props: AppProps) {
    super(scope, id, {
      disableResourceNameHashes: true,
    });

    const labels = {
      app: props.name,
    };

    const isBackend = ['backend', 'worker'].includes(props.name);
    const namespace = props.namespace;

    createConfigMap(this, isBackend);
    createDeployment(this, props, labels);
    const service = createService(this, props, labels);
    createIngress(this, props, isBackend, namespace, service);
  }
}

export class Worker extends Chart {
  constructor(scope: Construct, props: WorkerProps) {
    super(scope, 'worker', {
      disableResourceNameHashes: true,
    });

    const labels = {
      app: props.name,
    };

    createWorkerDeployment(this, props, labels);
  }
}
