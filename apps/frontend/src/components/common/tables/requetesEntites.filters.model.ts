import { REQUETE_PRIORITE_TYPES } from '@sirena/common/constants';

type RequetesQuickFiltersProfile = {
  entiteId?: string | null;
  topEntiteId?: string | null;
  entiteIdLevel?: number | null;
};

type RequetesQuickFiltersQueries = {
  entiteId?: string;
  prioriteId?: string;
};

export type AffectationQuickFilterConfig = {
  isVisible: boolean;
  label: string;
  targetEntiteId?: string;
  isChecked: boolean;
};

export type RequetesQuickFiltersViewModel = {
  affectation: AffectationQuickFilterConfig;
  isHautePrioriteOnly: boolean;
};

export function getAffectationQuickFilterConfig(
  profile: RequetesQuickFiltersProfile | null,
  queries: RequetesQuickFiltersQueries,
): AffectationQuickFilterConfig {
  const userEntiteIdLevel = profile?.entiteIdLevel;
  const isVisible = userEntiteIdLevel === 2 || userEntiteIdLevel === 3;
  const label = userEntiteIdLevel === 2 ? 'Affectées à ma direction' : 'Affectées à mon service';
  const targetEntiteId = profile?.topEntiteId === profile?.entiteId ? undefined : (profile?.entiteId ?? undefined);

  return {
    isVisible,
    label,
    targetEntiteId,
    isChecked: !!targetEntiteId && queries.entiteId === targetEntiteId,
  };
}

export function getRequetesQuickFiltersViewModel(
  profile: RequetesQuickFiltersProfile | null,
  queries: RequetesQuickFiltersQueries,
): RequetesQuickFiltersViewModel {
  return {
    affectation: getAffectationQuickFilterConfig(profile, queries),
    isHautePrioriteOnly: queries.prioriteId === REQUETE_PRIORITE_TYPES.HAUTE,
  };
}
