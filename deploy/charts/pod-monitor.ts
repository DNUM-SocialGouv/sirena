import { ApiObject, Chart } from 'cdk8s';
import type { Construct } from 'constructs';

interface PodMonitorProps {
  namespace: string;
  appName: 'backend' | 'worker';
  port: string;
  path: string;
  interval?: string;
  scrapeTimeout?: string;
}

export class PodMonitor extends Chart {
  constructor(scope: Construct, id: string, props: PodMonitorProps) {
    super(scope, id, {
      disableResourceNameHashes: true,
    });

    const { namespace, appName, port, path, interval = '30s', scrapeTimeout = '10s' } = props;

    new ApiObject(this, 'pod-monitor', {
      apiVersion: 'operator.victoriametrics.com/v1beta1',
      kind: 'PodMonitor',
      metadata: {
        name: `${appName}-metrics`,
        namespace,
        labels: {
          app: appName,
        },
      },
      spec: {
        selector: {
          matchLabels: {
            app: appName,
          },
        },
        namespaceSelector: {
          matchNames: [namespace],
        },
        podMetricsEndpoints: [
          {
            port,
            path,
            interval,
            scrapeTimeout,
            scheme: 'http',
            honorLabels: true,
            relabelConfigs: [
              {
                sourceLabels: ['__meta_kubernetes_pod_name'],
                targetLabel: 'pod',
              },
              {
                sourceLabels: ['__meta_kubernetes_namespace'],
                targetLabel: 'namespace',
              },
              {
                targetLabel: 'app_type',
                replacement: appName,
              },
            ],
          },
        ],
      },
    });
  }
}
