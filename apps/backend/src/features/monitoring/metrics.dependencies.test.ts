import { Registry } from '@prometheus-io/client';
import { describe, expect, it } from 'vitest';
import { recordDependencyCall, registerDependencyMetrics } from './metrics.dependencies.js';

// Registries are fresh per test and counters belong to a registry, so the registration list
// accumulating across tests does not interfere with the assertions.
describe('metrics.dependencies.ts', () => {
  const call = {
    dependency: 's3',
    operation: 'putObject',
    outcome: 'success',
  } as const;

  it('expose la série sur le registre enregistré', async () => {
    const register = new Registry();
    registerDependencyMetrics(register);

    recordDependencyCall({ ...call, durationMs: 120 });

    const metrics = await register.metrics();
    expect(metrics).toContain(
      'sirena_dependency_call_total{dependency="s3",operation="putObject",outcome="success"} 1',
    );
    expect(metrics).toContain('sirena_dependency_call_duration_seconds');
  });

  // The backend process creates two registries, so a single-slot recorder only ever fed the
  // last one and the series stayed empty on the backend.
  it('alimente tous les registres enregistrés, pas seulement le dernier', async () => {
    const backendRegister = new Registry();
    const workerRegister = new Registry();
    registerDependencyMetrics(backendRegister);
    registerDependencyMetrics(workerRegister);

    recordDependencyCall({ ...call, durationMs: 50 });

    for (const register of [backendRegister, workerRegister]) {
      expect(await register.metrics()).toContain(
        'sirena_dependency_call_total{dependency="s3",operation="putObject",outcome="success"} 1',
      );
    }
  });
});
