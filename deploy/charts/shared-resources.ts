import { Chart } from 'cdk8s';
import type { Construct } from 'constructs';
import * as externalSecrets from '../imports/external-secrets.io';
import * as cnpg from '../imports/postgresql.cnpg.io';

export class SharedResources extends Chart {
  constructor(scope: Construct, id: string) {
    super(scope, id, {
      disableResourceNameHashes: true,
    });

    // CNPG PostgreSQL Cluster
    new cnpg.Cluster(this, 'db', {
      metadata: {
        name: 'db',
      },
      spec: {
        bootstrap: {
          initdb: {
            database: 'sirena',
            owner: 'sirena',
          },
        },
        enableSuperuserAccess: true,
        instances: 1,
        storage: {
          size: '1Gi',
        },
      },
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
