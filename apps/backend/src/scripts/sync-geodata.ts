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
 * La même synchronisation est exécutée automatiquement par le cron `sync-geo-referentiel` ;
 * ce script sert à l'initialisation d'un environnement et aux vérifications manuelles.
 */

import * as Sentry from '@sentry/node';
import pino from 'pino';
import pretty from 'pino-pretty';
import { envVars } from '../config/env.js';
import { syncGeoReferentiel } from '../features/geoReferentiel/geoReferentiel.service.js';
import { createPinoConfig } from '../helpers/pino.js';
import { abortControllerStorage, loggerStorage, sentryStorage } from '../libs/asyncLocalStorage.js';
import { prisma } from '../libs/prisma.js';
import '../libs/instrument.js';

const createSyncLogger = () => {
  const destination =
    envVars.LOG_FORMAT === 'pretty'
      ? pretty({ ignore: 'pid,hostname', translateTime: 'SYS:standard', messageFormat: '{msg}', sync: true })
      : pino.destination({ sync: true });
  return pino(createPinoConfig(), destination);
};

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');

async function main() {
  const logger = createSyncLogger();
  const abortController = new AbortController();

  await loggerStorage.run(logger, async () => {
    Sentry.withScope(async (scope) => {
      await sentryStorage.run(scope, async () => {
        await abortControllerStorage.run(abortController, async () => {
          try {
            logger.info({ dryRun, force }, 'Starting op:sync:geodata...');

            const result = await syncGeoReferentiel({ dryRun, force, signal: abortController.signal });

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
  });
}

main();
