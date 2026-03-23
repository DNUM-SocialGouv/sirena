import { logMessage } from "../../utils/logs.js";

export async function saveTransformedDataToSirena(transformedData: any) {
  logMessage("Sauvegarde dans SIRENA", transformedData.id_data);
  return transformedData;
}
