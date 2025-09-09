import { Chart, Helm } from 'cdk8s';
import type { Construct } from 'constructs';

interface RedisChartProps {
  namespace?: string;
}

export class RedisChart extends Chart {
  constructor(scope: Construct, id: string, props: RedisChartProps) {
    super(scope, id, {
      disableResourceNameHashes: true,
      namespace: props.namespace,
    });

    new Helm(this, 'redis', {
      chart: 'oci://registry-1.docker.io/bitnamicharts/redis',
      releaseName: 'redis',
      namespace: props.namespace,
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
              memory: '256Mi',
            },
          },
        },
      },
    });
  }
}
