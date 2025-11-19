import type { SituationData } from '@sirena/common/schemas';
import type { useRequeteDetails } from '@/hooks/queries/useRequeteDetails';

type ServerSituationData = NonNullable<
  NonNullable<ReturnType<typeof useRequeteDetails>['data']>['requete']['situations']
>[number];

const hasValue = (value: unknown): boolean => {
  if (value === null || value === undefined || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') {
    return Object.values(value).some((v) => v !== null && v !== undefined && v !== '');
  }
  return true;
};

const checkMisEnCause = (misEnCause: unknown): boolean => {
  if (!misEnCause || typeof misEnCause !== 'object') return false;
  const mc = misEnCause as Record<string, unknown>;

  return (
    hasValue(mc.misEnCauseType) || hasValue(mc.misEnCausePrecision) || hasValue(mc.rpps) || hasValue(mc.commentaire)
  );
};

const checkLieu = (lieuDeSurvenue: unknown): boolean => {
  if (!lieuDeSurvenue || typeof lieuDeSurvenue !== 'object') return false;
  const lieu = lieuDeSurvenue as Record<string, unknown>;

  return (
    hasValue(lieu.lieuType) ||
    hasValue(lieu.lieuPrecision) ||
    hasValue(lieu.adresse) ||
    hasValue(lieu.societeTransport) ||
    hasValue(lieu.finess) ||
    hasValue(lieu.codePostal)
  );
};

const checkFaits = (fait: unknown, additionalFiles?: File[]): boolean => {
  if (!fait && (!additionalFiles || additionalFiles.length === 0)) return false;

  if (fait && typeof fait === 'object') {
    const f = fait as Record<string, unknown>;
    return (
      hasValue(f.motifs) ||
      hasValue(f.consequences) ||
      hasValue(f.maltraitanceTypes) ||
      hasValue(f.dateDebut) ||
      hasValue(f.dateFin) ||
      hasValue(f.commentaire) ||
      hasValue(f.autresPrecisions) ||
      hasValue(f.fichiers)
    );
  }

  return hasValue(additionalFiles);
};

const checkDemarches = (demarchesEngagees: unknown): boolean => {
  if (!demarchesEngagees || typeof demarchesEngagees !== 'object') return false;
  const demarches = demarchesEngagees as Record<string, unknown>;

  return hasValue(demarches.demarches);
};

export const hasSituationContent = (
  situation: SituationData | ServerSituationData | null | undefined,
  additionalFiles?: File[],
): boolean => {
  if (!situation) return false;

  const serverSituation = situation as ServerSituationData;
  const [fait] = serverSituation.faits ?? [(situation as SituationData).fait];

  const hasMisEnCause = checkMisEnCause(situation.misEnCause);
  const hasLieu = checkLieu(situation.lieuDeSurvenue);
  const hasFaits = checkFaits(fait, additionalFiles);
  const hasDemarches = checkDemarches(situation.demarchesEngagees);

  return hasMisEnCause || hasLieu || hasFaits || hasDemarches;
};
