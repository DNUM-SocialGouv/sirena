import { Checkbox } from '@codegouvfr/react-dsfr/Checkbox';
import { entiteTypes, REQUETE_PRIORITE_TYPES } from '@sirena/common/constants';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useCallback, useMemo, useState } from 'react';
import { DepartementFilter } from '@/components/common/filters/DepartementFilter';
import { useDepartementCounts } from '@/hooks/queries/departementCounts.hook';
import { useProfile } from '@/hooks/queries/profile.hook';

export function RequetesEntiteQuickFilters() {
  const queries = useSearch({ from: '/_auth/_user/home' });
  const navigate = useNavigate({ from: '/home' });
  const { data: profile } = useProfile();

  const userEntiteIdLevel = profile?.entiteIdLevel;
  const isTopEntiteARS = profile?.topEntiteTypeId === entiteTypes.ARS;

  const topProfileEntiteId = useMemo(() => {
    if (profile?.topEntiteId === profile?.entiteId) return undefined;
    return profile?.entiteId ?? undefined;
  }, [profile?.entiteId, profile?.topEntiteId]);

  const isHautePrioriteOnly = queries.prioriteId === REQUETE_PRIORITE_TYPES.HAUTE;

  const isAssignedToServiceOnly = !!topProfileEntiteId && queries.entiteId === topProfileEntiteId;

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

  const handleAffectationChange = useCallback(
    (checked: boolean) => {
      navigate({
        search: (prev) => ({
          ...prev,
          entiteId: checked ? topProfileEntiteId : undefined,
          offset: undefined,
        }),
      });
    },
    [navigate, topProfileEntiteId],
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

  const showAffectationFilter = userEntiteIdLevel === 2 || userEntiteIdLevel === 3;
  const affectationLabel = userEntiteIdLevel === 2 ? 'Affectées à ma direction' : 'Affectées à mon service';

  return (
    <div className="requetesEntitesTable__quick-filters fr-mb-2w">
      <Checkbox
        legend="Filtres rapides"
        orientation="horizontal"
        state="default"
        options={[
          {
            label: 'Priorité haute',
            nativeInputProps: {
              name: 'quick-filter-priorite',
              value: 'haute-priorite',
              checked: isHautePrioriteOnly,
              onChange: (e) => handlePrioriteChange(e.target.checked),
            },
          },
          ...(showAffectationFilter
            ? [
                {
                  label: affectationLabel,
                  nativeInputProps: {
                    name: 'quick-filter-affectation',
                    value: 'assigned-to-service',
                    checked: isAssignedToServiceOnly,
                    onChange: (e: React.ChangeEvent<HTMLInputElement>) => handleAffectationChange(e.target.checked),
                  },
                },
              ]
            : []),
        ]}
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
  );
}
