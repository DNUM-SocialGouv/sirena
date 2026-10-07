import { Counter, Histogram, type Registry } from '@prometheus-io/client';
import type { DependencyCallRecorder } from '../../libs/resilience.js';

type DependencyLabel = 'dependency' | 'operation' | 'outcome';

type DependencyMetrics = {
  total: Counter<DependencyLabel>;
  duration: Histogram<DependencyLabel>;
};

// Every registry is fed: createMetricsRegistry() runs twice in the backend process, which loads
// both metrics.backend.ts and metrics.worker.ts (the latter through the job scheduler).
const registered: DependencyMetrics[] = [];

export const registerDependencyMetrics = (register: Registry) => {
  registered.push({
    total: new Counter({
      name: 'sirena_dependency_call_total',
      help: 'Outbound calls to an external dependency, by outcome',
      labelNames: ['dependency', 'operation', 'outcome'],
      registers: [register],
    }),
    duration: new Histogram({
      name: 'sirena_dependency_call_duration_seconds',
      help: 'Duration of outbound calls to an external dependency',
      labelNames: ['dependency', 'operation', 'outcome'],
      buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60],
      registers: [register],
    }),
  });
};

export const recordDependencyCall: DependencyCallRecorder = ({ dependency, operation, outcome, durationMs }) => {
  const labels = { dependency, operation, outcome };

  for (const metrics of registered) {
    metrics.total.inc(labels);
    metrics.duration.observe(labels, durationMs / 1000);
  }
};
