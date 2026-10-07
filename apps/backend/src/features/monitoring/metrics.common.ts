import { collectDefaultMetrics, Registry } from '@prometheus-io/client';

export function createMetricsRegistry(): Registry {
  const register = new Registry();

  collectDefaultMetrics({
    register,
  });

  return register;
}
