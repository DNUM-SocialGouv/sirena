import { collectDefaultMetrics, Registry } from '@prometheus-io/client';
import { registerDependencyMetrics } from './metrics.dependencies.js';

export function createMetricsRegistry(): Registry {
  const register = new Registry();

  collectDefaultMetrics({
    register,
  });
  registerDependencyMetrics(register);

  return register;
}
