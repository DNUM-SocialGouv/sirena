import { DOMAINES_FONCTIONNELS, entiteTypes, REQUETE_PRIORITE_TYPES } from '@sirena/common/constants';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { type RefObject, useCallback, useMemo, useState } from 'react';
import { CheckboxFilter } from '@/components/common/filters/CheckboxFilter';
import { DepartementFilter } from '@/components/common/filters/DepartementFilter';
import { DomaineFilter } from '@/components/common/filters/DomaineFilter';
import { MoreFiltersDrawer } from '@/components/common/filters/MoreFiltersDrawer';
import { useDepartementCounts } from '@/hooks/queries/departementCounts.hook';
import { useDomaineCounts } from '@/hooks/queries/domaineCounts.hook';
import { useProfile } from '@/hooks/queries/profile.hook';
import { splitCsv } from '@/utils/filters';
import { getRequetesQuickFiltersViewModel } from './requetesEntites.filters.model';

type Props = {
  moreFiltersButtonRef?: RefObject<HTMLButtonElement | null>;
};

export function RequetesEntiteQuickFilters({ moreFiltersButtonRef }: Props) {
  const queries = useSearch({ from: '/_auth/_user/home' });
  const navigate = useNavigate({ from: '/home' });
  const { data: profile } = useProfile();

  const isTopEntiteARS = profile?.topEntiteTypeId === entiteTypes.ARS;
  const quickFilters = useMemo(() => getRequetesQuickFiltersViewModel(profile ?? null, queries), [profile, queries]);

  const arsDepartements = useMemo(() => profile?.topEntiteDepartements ?? [], [profile?.topEntiteDepartements]);
  const [isDepartementDropdownOpen, setIsDepartementDropdownOpen] = useState(false);
  const [isDomaineDropdownOpen, setIsDomaineDropdownOpen] = useState(false);

  const allDomaineIds = useMemo(() => Object.values(DOMAINES_FONCTIONNELS).join(','), []);

  const selectedDepartements = useMemo(() => splitCsv(queries.departementCodes), [queries.departementCodes]);

  const selectedDomaines = useMemo(() => splitCsv(queries.domaineIds), [queries.domaineIds]);

  const selectedStatuts = useMemo(() => splitCsv(queries.statutIds), [queries.statutIds]);

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

  const { data: domaineCountsData } = useDomaineCounts({
    domaineIds: allDomaineIds,
    entiteId: queries.entiteId,
    search: queries.search,
    enabled: isDomaineDropdownOpen,
  });

  const domaineCounts = useMemo(() => {
    if (!domaineCountsData) return null;
    return Object.fromEntries(domaineCountsData.map((d) => [d.id, d.count]));
  }, [domaineCountsData]);

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

  const handleDomaineChange = useCallback(
    (ids: string[]) => {
      navigate({
        search: (prev) => ({
          ...prev,
          domaineIds: ids.length > 0 ? ids.join(',') : undefined,
          offset: undefined,
        }),
      });
    },
    [navigate],
  );

  const handleStatutChange = useCallback(
    (ids: string[]) => {
      navigate({
        search: (prev) => ({
          ...prev,
          statutIds: ids.length > 0 ? ids.join(',') : undefined,
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
        <span className="fr-text--regular requetesEntitesTable__filters-label" aria-hidden="true">
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

          <DomaineFilter
            selectedIds={selectedDomaines}
            counts={domaineCounts}
            onChange={handleDomaineChange}
            onOpen={() => setIsDomaineDropdownOpen(true)}
            onClose={() => setIsDomaineDropdownOpen(false)}
          />
        </div>

        <div className="requetesEntitesTable__more-filters">
          <MoreFiltersDrawer
            selectedStatutIds={selectedStatuts}
            onApply={handleStatutChange}
            triggerRef={moreFiltersButtonRef}
          />
        </div>
      </div>
    </fieldset>
  );
}
