/**
 * sync-geodata.ts
 *
 * Rafraîchit les tables Commune et InseePostal depuis les référentiels publics
 * (t_geo_com pour les communes, Base officielle des codes postaux pour les codes postaux).
 *
 * Usage :
 *   tsx src/scripts/sync-geodata.ts [--dry-run] [--force]
 *
 * Options :
 *   --dry-run   Télécharge, contrôle et rapporte le diff sans rien écrire.
 *   --force     Applique les suppressions même quand leur volume déclenche le garde-fou.
 *
 * C'est le point d'entrée de la synchronisation périodique : le CronJob Kubernetes
 * `geo-sync` (helm_charts/charts/geo-sync) lance ce script tous les mois. Il sert aussi à
 * l'initialisation d'un environnement et aux vérifications manuelles.
 *
 * Hors dry-run, l'exécution est tracée dans la table `Crons` sous le nom `sync-geo-referentiel`.
 */

import * as Sentry from '@sentry/node';
import { withCronTrace } from '../crons/cronTrace.js';
import { syncGeoReferentiel } from '../features/geoReferentiel/geoReferentiel.service.js';
import { createScriptLogger } from '../helpers/pino.js';
import { loggerStorage, sentryStorage } from '../libs/asyncLocalStorage.js';
import { prisma } from '../libs/prisma.js';
import '../libs/instrument.js';

const CRON_NAME = 'sync-geo-referentiel';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');

async function main() {
  const logger = createScriptLogger();
  const abortController = new AbortController();

  // Kubernetes envoie SIGTERM à l'expiration d'`activeDeadlineSeconds`, et lors d'une
  // éviction. Sans cette interruption le process mourrait sans que `withCronTrace` clôture
  // sa ligne : elle resterait à l'état `started`, indiscernable d'une synchronisation en
  // cours, alors que la table `Crons` est la seule réponse en base à « comment la dernière
  // exécution s'est-elle finie ? ».
  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.once(signal, () => {
      logger.warn({ signal }, 'Signal reçu : interruption de la synchronisation');
      abortController.abort(new Error(`Synchronisation interrompue par ${signal}`));
    });
  }

  await loggerStorage.run(logger, async () => {
    Sentry.withScope(async (scope) => {
      await sentryStorage.run(scope, async () => {
        try {
          logger.info({ dryRun, force }, 'Starting op:sync:geodata...');

          const runSync = () => syncGeoReferentiel({ dryRun, force, signal: abortController.signal });

          // Un dry-run n'écrit rien : le tracer laisserait croire à une synchronisation
          // réelle dans l'historique des exécutions.
          const result = dryRun ? await runSync() : await withCronTrace(CRON_NAME, { force }, runSync);

          if (dryRun) {
            logger.info('Dry run : aucune écriture effectuée.');
          }
          if (result.deletionsSkipped) {
            logger.info('Suppressions ignorées par le garde-fou. Relancer avec --force pour les appliquer.');
          }
          if (result.coverage.missing.length > 0) {
            logger.info(
              `${result.coverage.missingCdCount} CD et ${result.coverage.missingDdCount} DDETS manquants pour ${result.coverage.territoiresCount} territoires.`,
            );
          }

          logger.info('op:sync:geodata completed successfully.');
          await prisma.$disconnect();
          process.exit(0);
        } catch (error) {
          logger.error({ err: error }, 'Error during op:sync:geodata');
          await prisma.$disconnect();
          process.exit(1);
        }
      });
    });
  });
}

main();
