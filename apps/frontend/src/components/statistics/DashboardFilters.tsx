import { fr } from '@codegouvfr/react-dsfr';
import { Tag } from '@codegouvfr/react-dsfr/Tag';
import { useCallback } from 'react';
import { CheckboxFilter } from '@/components/common/filters/CheckboxFilter';
import { DomaineFilter } from '@/components/common/filters/DomaineFilter';
import { LieuTypeFilter } from '@/components/common/filters/LieuTypeFilter';
import styles from './dashboardFilters.module.css';
import type { DashboardFilterKey } from './filterAvailability';
import { PeriodFilter } from './PeriodFilter';
import { describeCreatedPeriod, type PeriodSelection } from './period';

export type DashboardFiltersProps = {
  available: ReadonlySet<DashboardFilterKey>;
  period: PeriodSelection;
  onPeriodChange: (next: PeriodSelection) => void;
  selectedDomaines: string[];
  onDomaineChange: (ids: string[]) => void;
  selectedLieuTypes: string[];
  onLieuTypeChange: (tokens: string[]) => void;
  includeEIG: boolean;
  onIncludeEIGChange: (checked: boolean) => void;
};

export function DashboardFilters({
  available,
  period,
  onPeriodChange,
  selectedDomaines,
  onDomaineChange,
  selectedLieuTypes,
  onLieuTypeChange,
  includeEIG,
  onIncludeEIGChange,
}: DashboardFiltersProps) {
  const clearPeriod = useCallback(
    () => onPeriodChange({ period: undefined, startDate: undefined, endDate: undefined }),
    [onPeriodChange],
  );

  if (available.size === 0) return null;

  const activePeriodLabel = available.has('period') ? describeCreatedPeriod(period) : null;

  return (
    <fieldset className={styles.filters}>
      <legend className={fr.cx('fr-label', 'fr-mb-1v')}>Filtrer les indicateurs</legend>
      <div className={styles['filters__controls']}>
        {available.has('period') && <PeriodFilter value={period} onChange={onPeriodChange} />}
        {available.has('domaine') && (
          <DomaineFilter
            selectedIds={selectedDomaines}
            legend="Filtrer les indicateurs par domaine fonctionnel"
            onChange={onDomaineChange}
          />
        )}
        {available.has('lieu') && (
          <LieuTypeFilter
            selectedTokens={selectedLieuTypes}
            legend="Filtrer les indicateurs par type de lieu de survenue"
            onChange={onLieuTypeChange}
          />
        )}
        {available.has('eig') && (
          <CheckboxFilter label="Inclure les EIG" checked={includeEIG} onChange={onIncludeEIGChange} />
        )}
      </div>
      {activePeriodLabel ? (
        <div className={styles['filters__active']}>
          <Tag
            as="button"
            dismissible
            onClick={clearPeriod}
            nativeButtonProps={{ 'aria-label': `${activePeriodLabel}, retirer le filtre` }}
          >
            {activePeriodLabel}
          </Tag>
        </div>
      ) : null}
    </fieldset>
  );
}
