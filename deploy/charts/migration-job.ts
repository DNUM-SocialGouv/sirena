import { Chart } from 'cdk8s';
import type { Construct } from 'constructs';
import * as k8s from '../imports/k8s';

interface MigrationJobProps {
  name: string;
  image: string;
  namespace: string;
  environment: string;
  dbResetEnabled: string;
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

export class MigrationJob extends Chart {
  constructor(scope: Construct, props: MigrationJobProps) {
    super(scope, 'migration-job', {
      disableResourceNameHashes: true,
    });

    const labels = {
      app: props.name,
      job: 'migration',
    };

    new k8s.KubeJob(this, 'migration-job', {
      metadata: {
        name: `${props.name}-migration`,
        labels: labels,
        annotations: {
          'argocd.argoproj.io/hook': 'Sync',
          'argocd.argoproj.io/hook-delete-policy': 'BeforeHookCreation',
          'argocd.argoproj.io/sync-wave': '1',
        },
      },
      spec: {
        backoffLimit: 3,
        ttlSecondsAfterFinished: 300,
        template: {
          metadata: {
            labels: labels,
          },
          spec: {
            restartPolicy: 'Never',
            containers: [
              {
                name: 'migration',
                image: props.image,
                workingDir: '/app',
                command: [
                  'sh',
                  '-c',
                  'if [ "$DB_RESET_ENABLED" = "true" ]; then echo "Reset db"; pnpm --filter @sirena/backend db:reset; else echo "Deploy migrations"; pnpm --filter @sirena/backend db:deploy; fi && echo "Init seed" && pnpm --filter @sirena/backend db:seed',
                ],
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
                env: [
                  ...createDatabaseEnvVars(),
                  {
                    name: 'DB_RESET_ENABLED',
                    value: props.dbResetEnabled,
                  },
                ],
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
}
