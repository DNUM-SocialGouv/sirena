import { Worker } from "bullmq";
import {
  JOB_CONCURRENCY,
  QUEUE_NAME,
  redisConnection,
} from "../config/redis.js";
import processor from "../worker/processor.js";
import { logError, logMessage } from "../utils/logs.js";

logMessage(
  `Démarrage du worker BullMQ pour la file d'attente : ${QUEUE_NAME} avec une concurrence de : ${JOB_CONCURRENCY}`,
);

const worker = new Worker(QUEUE_NAME, processor, {
  connection: redisConnection,
  concurrency: JOB_CONCURRENCY,
});

worker.on("completed", (job) => {
  logMessage(`Job ${job.id} terminé avec succès`);
});

worker.on("failed", (job, err) => {
  logError(`Job ${job?.id} a échoué avec erreur : ${err.message}`);
});

process.on("SIGINT", async () => {
  logMessage("Arrêt du worker...");
  await worker.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logMessage("Arrêt du worker...");
  await worker.close();
  process.exit(0);
});
