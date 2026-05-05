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
  onSortChange: (params: OnSortChangeParams<T>) => void;
  label: string;
  sortLabels?: { asc: string; desc: string; reset: string };
};

const getNextDirection = (current: SortDirection): SortDirection => {
  const directions: Record<SortDirection, SortDirection> = {
    [SORT_DIRECTIONS.NONE]: SORT_DIRECTIONS.ASC,
    [SORT_DIRECTIONS.ASC]: SORT_DIRECTIONS.DESC,
    [SORT_DIRECTIONS.DESC]: SORT_DIRECTIONS.NONE,
  };
  return directions[current];
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
  onSortChange,
  sortLabels,
}: SortButtonProps<T>) => {
  const isActive = sort === sortKey;
  const currentDirection = isActive ? sortDirection : SORT_DIRECTIONS.NONE;
  const nextDirection = isActive ? getNextDirection(sortDirection) : SORT_DIRECTIONS.ASC;

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
