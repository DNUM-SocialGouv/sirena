import { serializeError } from '../helpers/errors.js';
import { endCron, startCron } from './crons.service.js';

/**
 * Enregistre l'exécution d'un traitement périodique dans la table `Crons`.
 *
 * `withCronLifecycle` rend le même service aux jobs du planificateur interne, mais exige un
 * job BullMQ et publie une métrique depuis le worker. Un traitement déclenché de l'extérieur
 * — un CronJob Kubernetes — n'a ni l'un ni l'autre : il lui reste cette trace, seule réponse
 * en base à « quand la dernière synchronisation a-t-elle tourné, et comment s'est-elle finie ? ».
 *
 * L'échec est tracé puis relancé : c'est le code de sortie du processus qui fait foi pour
 * Kubernetes.
 */
export const withCronTrace = async <R extends Record<string, unknown>>(
  name: string,
  params: Record<string, unknown>,
  run: () => Promise<R>,
): Promise<R> => {
  const startedAt = new Date();
  const cron = await startCron({ name, startedAt, params });

  try {
    const result = await run();
    await endCron({ id: cron.id, endedAt: new Date(), result, state: 'success' });
    return result;
  } catch (error) {
    await endCron({ id: cron.id, endedAt: new Date(), result: serializeError(error), state: 'error' });
    throw error;
  }
};
