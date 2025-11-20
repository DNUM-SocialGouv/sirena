import inseePostalRaw from './inseetocodepostal.json';
import listeEntitesRaw from './liste_entites.json';

type InseePostalRow = {
  codeInsee: string;
  codePostal: string;
};

type ListeEntiteRow = {
  COM_CODE: string;
  DPT_CODE_ACTUEL: string;
  DPT_LIB_ACTUEL: string;
  REG_CODE_ACTUEL: string;
  REG_LIB_ACTUEL: string;
};

export type GeoEntite = {
  inseeCode: string;
  postalCode: string;
  departementCode: string;
  departementName: string;
  regionCode: string;
  regionName: string;
};

const inseePostal = inseePostalRaw as InseePostalRow[];
const listeEntites = listeEntitesRaw as ListeEntiteRow[];

let indexByPostalCode: Map<string, GeoEntite[]> | null = null;

export function buildIndex(): Map<string, GeoEntite[]> {
  const map = new Map<string, GeoEntite[]>();

  const entitesByInsee = new Map(listeEntites.map((row) => [row.COM_CODE, row]));

  for (const row of inseePostal) {
    const entite = entitesByInsee.get(row.codeInsee);
    if (!entite) continue;

    const geo: GeoEntite = {
      inseeCode: row.codeInsee,
      postalCode: row.codePostal,
      departementCode: entite.DPT_CODE_ACTUEL,
      departementName: entite.DPT_LIB_ACTUEL,
      regionCode: entite.REG_CODE_ACTUEL,
      regionName: entite.REG_LIB_ACTUEL,
    };

    if (!map.has(row.codePostal)) map.set(row.codePostal, []);
    const existing = map.get(row.codePostal);
    if (existing) {
      existing.push(geo);
    }
  }

  return map;
}

export function findGeoByPostalCode(cp: string): GeoEntite | null {
  if (!indexByPostalCode) {
    indexByPostalCode = buildIndex();
  }
  const list = indexByPostalCode.get(cp);
  return list?.[0] ?? null;
}
