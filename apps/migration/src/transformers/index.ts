import { generateSirenaId } from '../model/sirena/generateSirenaId.js';
import type { SirecReclamation, SirenaRequete } from '../model/type.js';

export function transformData(sirecReclamation: SirecReclamation): SirenaRequete {
  return {
    id: generateSirenaId(sirecReclamation),
  };
}
