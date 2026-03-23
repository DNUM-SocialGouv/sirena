import { Job } from "bullmq";
import { transformData } from "../transformers/index.js";
import { saveTransformedDataToSirena } from "../model/sirena/index.js";
import { logError, logMessage } from "../utils/logs.js";
import { getSirecReclamationDataById } from "../model/sirec/sirec-reclamation-data.js";

export default async function processor(job: Job) {
  const { id } = job.data;
  logMessage(`Début migration pour le SIREC ID : ${id}`);

  try {
    // 1. Fetch à partir de SIREC
    const sirecReclamationData = await getSirecReclamationDataById(id);

    if (!sirecReclamationData) {
      logError(`Aucun enregistrement SIREC pour l'ID : ${id}`);
      return { success: false, reason: "NOT_FOUND" };
    }

    // 2. Transformation vers le modèle SIRENA
    const transformedData = transformData(sirecReclamationData);

    // 3. Sauvegarde dans SIRENA
    await saveTransformedDataToSirena(transformedData);

    logMessage(`Migration OK pour le SIREC ID ${id}`);
    return { success: true };
  } catch (error) {
    logError(`Exception pendant le traitement du SIREC ID ${id}:`, error);
    throw error;
  }
}
