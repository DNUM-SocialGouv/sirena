import { Chart, Helm } from 'cdk8s';
import type { Construct } from 'constructs';

interface RedisChartProps {
  namespace?: string;
  environment: string;
}

export class RedisChart extends Chart {
  constructor(scope: Construct, id: string, _props: RedisChartProps) {
    super(scope, id, {
      disableResourceNameHashes: true,
    });

    new Helm(this, 'redis', {
      chart: 'oci://registry-1.docker.io/bitnamicharts/redis',
      releaseName: 'redis',
      values: {
        auth: {
          enabled: false,
        },
        architecture: 'standalone',
        master: {
          resources: {
            limits: {
              cpu: '150m',
              memory: '256Mi',
            },
            requests: {
              cpu: '100m',
              memory: '128Mi',
            },
          },
        },
      },
    });
  }
}
