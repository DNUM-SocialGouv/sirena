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
  label: string;
  sortLabels?: { asc: string; desc: string; reset: string };
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

const getSortText = (nextDirection: SortDirection, sortLabels?: { asc: string; desc: string; reset: string }) => {
  if (nextDirection === SORT_DIRECTIONS.NONE) {
    return sortLabels?.reset ?? 'Réinitialiser le tri';
  }

  if (nextDirection === SORT_DIRECTIONS.ASC) {
    return sortLabels?.asc ?? 'Trier par ordre croissant';
  }

  return sortLabels?.desc ?? 'Trier par ordre décroissant';
};

export const SortButtonComponent = <T extends string>({
  sortKey,
  sort,
  sortDirection,
  initialSortDirection = SORT_DIRECTIONS.ASC,
  onSortChange,
  sortLabels,
}: SortButtonProps<T>) => {
  const isActive = sort === sortKey;
  const currentDirection = isActive ? sortDirection : SORT_DIRECTIONS.NONE;
  const nextDirection = getNextDirection(currentDirection, initialSortDirection);

  const onClick = () => {
    const nextSort = nextDirection === SORT_DIRECTIONS.NONE ? '' : sortKey;
    onSortChange({ sort: nextSort, sortDirection: nextDirection });
  };

  const iconClass = getSortIcon(isActive, currentDirection);
  const sortText = getSortText(nextDirection, sortLabels);

  return (
    <button type="button" onClick={onClick} className="data-table-sort-button" title={sortText}>
      <span className={iconClass} aria-hidden="true" />
      <span className="fr-sr-only">{sortText}</span>
    </button>
  );
};

export const SortButton = memo(SortButtonComponent, (prev, next) => {
  if (prev.sort !== prev.sortKey && next.sort !== next.sortKey) return true;
  return prev.sort === next.sort && prev.sortKey === next.sortKey && prev.sortDirection === next.sortDirection;
}) as typeof SortButtonComponent;

export type { SortDirection } from './SortButton.constants.tsx';
