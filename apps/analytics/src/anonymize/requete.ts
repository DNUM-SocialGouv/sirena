export type AnonymizedRequete = {
  sourceId: string;
  statut: string;
  priorite: string | null;
  receptionType: string | null;
  provenance: string | null;
  declarantAge: string | null;
  declarantCivilite: string | null;
  declarantEstVictime: boolean | null;
  declarantLienVictime: string | null;
  declarantDepartement: string | null;
  declarantEstHandicapee: boolean | null;
  nombreFaits: number;
  nombreConsequences: number;
  nombreEtapes: number;
  estCloturee: boolean;
  raisonCloture: string | null;
  sourceCreatedAt: Date;
  sourceUpdatedAt: Date;
  receptionDate: Date | null;
  creationDate: Date;
  misEnCauseTypeId: string | null;
  lieuTypeId: string | null;
  communeCodePostal: string | null;
  entiteId: string | null;
  motifIds: string[];
  consequenceIds: string[];
  maltraitanceTypeIds: string[];
  situationId: string | null;
};

type SourceRequete = {
  id: string;
  receptionDate: Date | null;
  receptionType: { label: string } | null;
  provenance: { label: string } | null;
  declarant: {
    estVictime: boolean | null;
    estHandicapee: boolean | null;
    age: { label: string } | null;
    identite: { civilite: { label: string } | null } | null;
    lienVictime: { label: string } | null;
    adresse: { codePostal: string } | null;
  } | null;
  etapes: Array<{
    statut: { id: string };
    clotureReason: Array<{ label: string }>;
  }>;
  requeteEntites: Array<{
    statut: { label: string };
    priorite: { label: string } | null;
    entiteId: string;
  }>;
  situations: Array<{
    id: string;
    lieuDeSurvenue: {
      lieuTypeId: string | null;
      adresse: { codePostal: string } | null;
    };
    misEnCause: {
      misEnCauseTypeId: string | null;
    };
    faits: Array<{
      motifs: Array<{ motifId: string }>;
      consequences: Array<{ consequenceId: string }>;
      maltraitanceTypes: Array<{ maltraitanceTypeId: string }>;
    }>;
  }>;
  createdAt: Date;
  updatedAt: Date;
};

function extractDepartement(codePostal: string | null | undefined): string | null {
  if (!codePostal || codePostal.length < 2) return null;
  if (codePostal.startsWith('97') && codePostal.length >= 3) return codePostal.slice(0, 3);
  return codePostal.slice(0, 2);
}

const CLOSED_STATUT_IDS = new Set(['CLOTUREE', 'CLASSEE_SANS_SUITE']);

export function anonymizeRequete(source: SourceRequete): AnonymizedRequete {
  const [firstRequeteEntite] = source.requeteEntites;
  const [firstSituation] = source.situations;

  const allMotifIds: string[] = [];
  const allConsequenceIds: string[] = [];
  const allMaltraitanceTypeIds: string[] = [];
  let totalConsequences = 0;

  for (const situation of source.situations) {
    for (const fait of situation.faits) {
      for (const m of fait.motifs) allMotifIds.push(m.motifId);
      for (const c of fait.consequences) {
        allConsequenceIds.push(c.consequenceId);
        totalConsequences++;
      }
      for (const mt of fait.maltraitanceTypes) allMaltraitanceTypeIds.push(mt.maltraitanceTypeId);
    }
  }

  const lastEtape = source.etapes[source.etapes.length - 1];
  const estCloturee = lastEtape ? CLOSED_STATUT_IDS.has(lastEtape.statut.id) : false;
  const [clotureReason] = lastEtape?.clotureReason ?? [];

  return {
    sourceId: source.id,
    statut: firstRequeteEntite?.statut.label ?? 'INCONNU',
    priorite: firstRequeteEntite?.priorite?.label ?? null,
    receptionType: source.receptionType?.label ?? null,
    provenance: source.provenance?.label ?? null,
    declarantAge: source.declarant?.age?.label ?? null,
    declarantCivilite: source.declarant?.identite?.civilite?.label ?? null,
    declarantEstVictime: source.declarant?.estVictime ?? null,
    declarantLienVictime: source.declarant?.lienVictime?.label ?? null,
    declarantDepartement: extractDepartement(source.declarant?.adresse?.codePostal),
    declarantEstHandicapee: source.declarant?.estHandicapee ?? null,
    nombreFaits: source.situations.length,
    nombreConsequences: totalConsequences,
    nombreEtapes: source.etapes.length,
    estCloturee,
    raisonCloture: estCloturee ? (clotureReason?.label ?? null) : null,
    sourceCreatedAt: source.createdAt,
    sourceUpdatedAt: source.updatedAt,
    receptionDate: source.receptionDate,
    creationDate: source.createdAt,
    misEnCauseTypeId: firstSituation?.misEnCause.misEnCauseTypeId ?? null,
    lieuTypeId: firstSituation?.lieuDeSurvenue.lieuTypeId ?? null,
    communeCodePostal: firstSituation?.lieuDeSurvenue.adresse?.codePostal ?? null,
    entiteId: firstRequeteEntite?.entiteId ?? null,
    motifIds: [...new Set(allMotifIds)],
    consequenceIds: [...new Set(allConsequenceIds)],
    maltraitanceTypeIds: [...new Set(allMaltraitanceTypeIds)],
    situationId: firstSituation?.id ?? null,
  };
}
