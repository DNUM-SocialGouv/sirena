import { Chart } from 'cdk8s';
import type { Construct } from 'constructs';
import * as externalSecrets from '../imports/external-secrets.io';

export class ExternalSecrets extends Chart {
  constructor(scope: Construct, id: string, environnement: string) {
    super(scope, id, {
      disableResourceNameHashes: true,
    });

    // Backend External Secret
    new externalSecrets.ExternalSecret(this, 'backend-external-secret', {
      metadata: {
        name: 'backend',
      },
      spec: {
        dataFrom: [
          {
            extract: {
              key: 'backend',
            },
          },
        ],
        refreshInterval: '1h',
        secretStoreRef: {
          name: 'local-secret-store',
        },
        target: {
          name: 'backend',
          template: {
            data: {
              PC_CLIENT_ID: '{{ .PC_CLIENT_ID }}',
              PC_CLIENT_SECRET: '{{ .PC_CLIENT_SECRET }}',
              AUTH_TOKEN_SECRET_KEY: '{{ .AUTH_TOKEN_SECRET_KEY }}',
              REFRESH_TOKEN_SECRET_KEY: '{{ .REFRESH_TOKEN_SECRET_KEY }}',
              DEMAT_SOCIAL_API_TOKEN: '{{ .DEMAT_SOCIAL_API_TOKEN }}',
            },
          },
        },
      },
    });

    // Database External Secret
    new externalSecrets.ExternalSecret(this, 'database-external-secret', {
      metadata: {
        name: 'database',
      },
      spec: {
        dataFrom: [
          {
            extract: {
              key: `databases/sirena-${environnement}`,
            },
          },
        ],
        refreshInterval: '1h',
        secretStoreRef: {
          name: 'local-secret-store',
        },
        target: {
          name: 'db',
          template: {
            data: {
              dbname: '{{ .dbname }}',
              username: '{{ .username }}',
              password: '{{ .password }}',
              host: '{{ .host }}',
              port: '{{ .port }}',
              url: '{{ .url }}',
            },
          },
        },
      },
    });

    // GHCR Registry External Secret
    new externalSecrets.ExternalSecret(this, 'ghcr-registry-external-secret', {
      metadata: {
        name: 'ghcr-registry',
      },
      spec: {
        dataFrom: [
          {
            extract: {
              key: 'ghcr-registry',
            },
          },
        ],
        refreshInterval: '1h',
        secretStoreRef: {
          name: 'local-secret-store',
        },
        target: {
          name: 'ghcr-registry',
          template: {
            data: {
              '.dockerconfigjson':
                '{"auths":{"{{ .host }}":{"auth":"{{ printf "%s:%s" .username .password | b64enc }}"}}}',
            },
            type: 'kubernetes.io/dockerconfigjson',
          },
        },
      },
    });
  }
}
