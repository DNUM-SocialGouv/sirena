import type {SirecReclamation} from "../type.js";

export const generateSirenaId = (sirecReclamantion: SirecReclamation) => "SIREC-" + sirecReclamantion.id_data.toString();