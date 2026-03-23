import type { SirecReclamationData } from "../model/sirec/sirec-reclamation-data.js";

export function transformData(sirecReclamationData: SirecReclamationData): any {
  return {
    ...sirecReclamationData,
    _migratedAt: new Date(),
  };
}
