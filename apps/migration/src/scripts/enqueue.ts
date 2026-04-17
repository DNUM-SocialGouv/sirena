import { Queue } from 'bullmq';
import { mysqlPool } from '../config/mysql.js';
import { QUEUE_NAME, redisConnection } from '../config/redis.js';
import { logError, logMessage } from '../utils/logs.js';

const migrationQueue = new Queue(QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'fixed',
      delay: 10000,
    },
  },
});

async function enqueueAll() {
  logMessage(`Début ajout dans la file d'attente : ${QUEUE_NAME}`);

  try {
    logMessage('Récupération des IDs depuis SIREC');
    const rows = [{ id: 1 }, { id: 2 }, { id: 3 }]; // TODO voir comment on récupèrera les ids à migrer

    logMessage(`${rows.length} IDs à migrer. Ajout dans la file d'attente...`);

    for (const row of rows) {
      await migrationQueue.add('migrate-record', { id: row.id });
    }

    logMessage("Ajout dans la file d'attente terminé avec succès !");
  } catch (error) {
    logError("Erreur lors de l'ajout dans la file d'attente :", error);
  } finally {
    await migrationQueue.close();
    await mysqlPool.end();
    process.exit(0);
  }
}

enqueueAll();
