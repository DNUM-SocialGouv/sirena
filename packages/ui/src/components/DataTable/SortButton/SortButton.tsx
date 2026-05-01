import { memo } from 'react';
import { SORT_DIRECTIONS, type SortDirection } from './SortButton.constants.tsx';

export type OnSortChangeParams<T extends string> = {
  sort: T | '';
  sortDirection: SortDirection;
};

type SortButtonProps<T extends string> = {
  sort: T | '';
  sortKey: T;
  sortDirection: SortDirection;
  initialSortDirection?: Exclude<SortDirection, ''>;
  onSortChange: (params: OnSortChangeParams<T>) => void;
};

const getNextDirection = (current: SortDirection, initialSortDirection: Exclude<SortDirection, ''>): SortDirection => {
  const oppositeDirection = initialSortDirection === SORT_DIRECTIONS.ASC ? SORT_DIRECTIONS.DESC : SORT_DIRECTIONS.ASC;

  if (current === SORT_DIRECTIONS.NONE) {
    return initialSortDirection;
  }

  if (current === initialSortDirection) {
    return oppositeDirection;
  }

  return SORT_DIRECTIONS.NONE;
};

const getSortIcon = (isActive: boolean, sortDirection: SortDirection): string => {
  if (!isActive || sortDirection === SORT_DIRECTIONS.NONE) {
    return 'fr-icon-arrow-up-down-line';
  }
  if (sortDirection === SORT_DIRECTIONS.ASC) {
    return 'fr-icon-arrow-up-line';
  }
  return 'fr-icon-arrow-down-line';
};

const getSortLabel = (isActive: boolean, sortDirection: SortDirection): string => {
  if (!isActive || sortDirection === SORT_DIRECTIONS.NONE) {
    return 'Trier';
  }
  if (sortDirection === SORT_DIRECTIONS.ASC) {
    return 'Tri croissant';
  }
  return 'Tri décroissant';
};

export const SortButtonComponent = <T extends string>({
  sortKey,
  sort,
  sortDirection,
  initialSortDirection = SORT_DIRECTIONS.ASC,
  onSortChange,
}: SortButtonProps<T>) => {
  const isActive = sort === sortKey;
  const currentDirection = isActive ? sortDirection : SORT_DIRECTIONS.NONE;
  const nextDirection = getNextDirection(currentDirection, initialSortDirection);

  const onClick = () => {
    const nextSort = nextDirection === SORT_DIRECTIONS.NONE ? '' : sortKey;
    onSortChange({ sort: nextSort, sortDirection: nextDirection });
  };

  const iconClass = getSortIcon(isActive, currentDirection);
  const label = getSortLabel(isActive, currentDirection);

  return (
    <button
      type="button"
      onClick={onClick}
      className="data-table-sort-button"
      aria-pressed={isActive ? 'true' : 'false'}
    >
      <span className="fr-sr-only">{label}</span>
      <span className={iconClass} aria-hidden="true" />
    </button>
  );
};

export const SortButton = memo(SortButtonComponent, (prev, next) => {
  if (prev.sort !== prev.sortKey && next.sort !== next.sortKey) return true;
  return prev.sort === next.sort && prev.sortKey === next.sortKey && prev.sortDirection === next.sortDirection;
}) as typeof SortButtonComponent;

export type { SortDirection } from './SortButton.constants.tsx';
