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
};

const getNextDirection = (current: SortDirection): SortDirection => {
  const directions: Record<SortDirection, SortDirection> = {
    [SORT_DIRECTIONS.NONE]: SORT_DIRECTIONS.ASC,
    [SORT_DIRECTIONS.ASC]: SORT_DIRECTIONS.DESC,
    [SORT_DIRECTIONS.DESC]: SORT_DIRECTIONS.NONE,
  };
  return directions[current];
};

export const SortButtonComponent = <T extends string>({
  sortKey,
  sort,
  sortDirection,
  onSortChange,
}: SortButtonProps<T>) => {
  const isActive = sort === sortKey;
  const nextDirection = isActive ? getNextDirection(sortDirection) : SORT_DIRECTIONS.ASC;

  const onClick = () => {
    const nextSort = nextDirection === SORT_DIRECTIONS.NONE ? '' : sortKey;
    onSortChange({ sort: nextSort, sortDirection: nextDirection });
  };

  return (
    <button type="button" onClick={onClick} className="fr-btn--sort fr-btn fr-btn--sm">
      Trier
    </button>
  );
};

export const SortButton = memo(SortButtonComponent, (prev, next) => {
  if (prev.sort !== prev.sortKey && next.sort !== next.sortKey) return true;
  return prev.sort === next.sort && prev.sortKey === next.sortKey && prev.sortDirection === next.sortDirection;
}) as typeof SortButtonComponent;

export type { SortDirection } from './SortButton.constants.tsx';
