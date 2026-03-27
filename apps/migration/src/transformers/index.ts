import type {SirecReclamation, SirenaRequete} from "../model/type.js";
import {generateSirenaId} from "../model/sirena/generateSirenaId.js";

export function transformData(sirecReclamation: SirecReclamation): SirenaRequete {
  return {
    id: generateSirenaId(sirecReclamation)
  };
}
