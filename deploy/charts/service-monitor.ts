import { ApiObject, Chart } from 'cdk8s';
import type { Construct } from 'constructs';

interface ServiceMonitorProps {
  namespace: string;
  serviceName: string;
  port: string;
  path: string;
  interval?: string;
  scrapeTimeout?: string;
}

export class ServiceMonitor extends Chart {
  constructor(scope: Construct, id: string, props: ServiceMonitorProps) {
    super(scope, id, {
      disableResourceNameHashes: true,
    });

    const { namespace, serviceName, port, path, interval = '30s', scrapeTimeout = '10s' } = props;

    new ApiObject(this, 'service-monitor', {
      apiVersion: 'operator.victoriametrics.com/v1beta1',
      kind: 'ServiceMonitor',
      metadata: {
        name: `${serviceName}-metrics`,
        namespace,
        labels: {
          app: serviceName,
        },
      },
      spec: {
        selector: {
          matchLabels: {
            app: serviceName,
          },
        },
        namespaceSelector: {
          matchNames: [namespace],
        },
        endpoints: [
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
                sourceLabels: ['__meta_kubernetes_service_name'],
                targetLabel: 'service',
              },
            ],
          },
        ],
      },
    });
  }
}
