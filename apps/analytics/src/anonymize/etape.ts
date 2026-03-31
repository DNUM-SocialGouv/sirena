export type AnonymizedEtape = {
  sourceId: string;
  requeteSourceId: string;
  nom: string;
  statut: string;
  estPartagee: boolean;
  nombreNotes: number;
  sourceCreatedAt: Date;
  sourceUpdatedAt: Date;
  entiteSourceId: string;
};

type SourceEtape = {
  id: string;
  nom: string;
  estPartagee: boolean;
  statut: { label: string };
  requeteId: string;
  entiteId: string;
  notes: Array<{ id: string }>;
  createdAt: Date;
  updatedAt: Date;
};

export function anonymizeEtape(source: SourceEtape): AnonymizedEtape {
  return {
    sourceId: source.id,
    requeteSourceId: source.requeteId,
    nom: source.nom,
    statut: source.statut.label,
    estPartagee: source.estPartagee,
    nombreNotes: source.notes.length,
    sourceCreatedAt: source.createdAt,
    sourceUpdatedAt: source.updatedAt,
    entiteSourceId: source.entiteId,
  };
}
