import { collectDefaultMetrics, Registry } from 'prom-client';

export function createMetricsRegistry(): Registry {
  const register = new Registry();

  collectDefaultMetrics({
    register,
  });

  return register;
}
