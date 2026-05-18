import { entiteTypes, REQUETE_PRIORITE_TYPES } from '@sirena/common/constants';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useCallback, useMemo, useState } from 'react';
import { CheckboxFilter } from '@/components/common/filters/CheckboxFilter';
import { DepartementFilter } from '@/components/common/filters/DepartementFilter';
import { useDepartementCounts } from '@/hooks/queries/departementCounts.hook';
import { useProfile } from '@/hooks/queries/profile.hook';
import { getRequetesQuickFiltersViewModel } from './requetesEntites.filters.model';

export function RequetesEntiteQuickFilters() {
  const queries = useSearch({ from: '/_auth/_user/home' });
  const navigate = useNavigate({ from: '/home' });
  const { data: profile } = useProfile();

  const isTopEntiteARS = profile?.topEntiteTypeId === entiteTypes.ARS;
  const quickFilters = useMemo(() => getRequetesQuickFiltersViewModel(profile ?? null, queries), [profile, queries]);

  const arsDepartements = useMemo(() => profile?.topEntiteDepartements ?? [], [profile?.topEntiteDepartements]);
  const [isDepartementDropdownOpen, setIsDepartementDropdownOpen] = useState(false);

  const selectedDepartements = useMemo(
    () => (queries.departementCodes ? queries.departementCodes.split(',').filter(Boolean) : []),
    [queries.departementCodes],
  );

  const { data: departementCountsData } = useDepartementCounts({
    departementCodes: arsDepartements.map((d) => d.code).join(','),
    entiteId: queries.entiteId,
    search: queries.search,
    enabled: isTopEntiteARS && isDepartementDropdownOpen,
  });

  const departementCounts = useMemo(() => {
    if (!departementCountsData) return null;
    return Object.fromEntries(departementCountsData.map((d) => [d.code, d.count]));
  }, [departementCountsData]);

  const handleAffectationChange = useCallback(
    (checked: boolean) => {
      navigate({
        search: (prev) => ({
          ...prev,
          entiteId: checked ? quickFilters.affectation.targetEntiteId : undefined,
          offset: undefined,
        }),
      });
    },
    [navigate, quickFilters.affectation.targetEntiteId],
  );

  const handlePrioriteChange = useCallback(
    (checked: boolean) => {
      navigate({
        search: (prev) => ({
          ...prev,
          prioriteId: checked ? REQUETE_PRIORITE_TYPES.HAUTE : undefined,
          offset: undefined,
        }),
      });
    },
    [navigate],
  );

  const handleDepartementChange = useCallback(
    (codes: string[]) => {
      navigate({
        search: (prev) => ({
          ...prev,
          departementCodes: codes.length > 0 ? codes.join(',') : undefined,
          offset: undefined,
        }),
      });
    },
    [navigate],
  );

  return (
    <fieldset className="requetesEntitesTable__filters fr-mb-2w">
      <legend className="fr-sr-only">Filtrer les requêtes</legend>
      <div className="requetesEntitesTable__filters-row">
        <span className="fr-text--regular" aria-hidden="true">
          Filtrer les requêtes
        </span>
        <div className="requetesEntitesTable__quick-filters">
          {quickFilters.affectation.isVisible && (
            <CheckboxFilter
              label={quickFilters.affectation.label}
              checked={quickFilters.affectation.isChecked}
              onChange={handleAffectationChange}
            />
          )}

          <CheckboxFilter
            label="Priorité haute"
            checked={quickFilters.isHautePrioriteOnly}
            onChange={handlePrioriteChange}
          />

          {isTopEntiteARS && (
            <DepartementFilter
              departements={arsDepartements}
              selectedCodes={selectedDepartements}
              counts={departementCounts}
              onChange={handleDepartementChange}
              onOpen={() => setIsDepartementDropdownOpen(true)}
              onClose={() => setIsDepartementDropdownOpen(false)}
            />
          )}
        </div>
      </div>
    </fieldset>
  );
}
