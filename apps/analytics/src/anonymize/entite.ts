export type AnonymizedEntite = {
  sourceId: string;
  nomComplet: string;
  label: string;
  entiteType: string;
  departementCode: string | null;
  regionCode: string | null;
  regLib: string | null;
  dptLib: string | null;
  isActive: boolean;
  entiteMereLabel: string | null;
};

type SourceEntite = {
  id: string;
  nomComplet: string;
  label: string;
  entiteType: { label: string };
  departementCode: string | null;
  regionCode: string | null;
  regLib: string | null;
  dptLib: string | null;
  isActive: boolean;
  entiteMere: { label: string } | null;
};

export function anonymizeEntite(source: SourceEntite): AnonymizedEntite {
  return {
    sourceId: source.id,
    nomComplet: source.nomComplet,
    label: source.label,
    entiteType: source.entiteType.label,
    departementCode: source.departementCode,
    regionCode: source.regionCode,
    regLib: source.regLib,
    dptLib: source.dptLib,
    isActive: source.isActive,
    entiteMereLabel: source.entiteMere?.label ?? null,
  };
}
