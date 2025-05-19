import { memo } from 'react';

export type SortDirection = 'asc' | 'desc' | '';
export type OnSortChangeParams<T extends string> = {
  sort: T | '';
  sortDirection: SortDirection;
};
type AriaSort = 'ascending' | 'descending' | 'none';

type SortButtonProps<T extends string> = {
  sort: T | '';
  sortKey: T;
  sortDirection: SortDirection;
  onSortChange: (params: { sort: T | ''; sortDirection: SortDirection }) => void;
};

const getNextDirection = (current: SortDirection): SortDirection => {
  const directions = {
    '': 'asc',
    asc: 'desc',
    desc: '',
  } as const;
  return directions[current];
};

const getAriaSort = (isActive: boolean, sortDirection: SortDirection): AriaSort => {
  if (!isActive) {
    return 'none';
  }
  const ariaSorts = {
    asc: 'ascending',
    desc: 'descending',
    '': 'none',
  } as const;
  return ariaSorts[sortDirection];
};

export const SortButtonComponent = <T extends string>({
  sortKey,
  sort,
  sortDirection,
  onSortChange,
}: SortButtonProps<T>) => {
  const isActive = sort === sortKey;

  const nextDirection = isActive ? getNextDirection(sortDirection) : 'asc';

  const onClick = () => {
    const nextSort = nextDirection === '' ? '' : sortKey;
    onSortChange({ sort: nextSort, sortDirection: nextDirection });
  };

  const ariaSort = getAriaSort(isActive, sortDirection);

  return (
    <button type="button" onClick={onClick} className="fr-btn--sort fr-btn fr-btn--sm" aria-sort={ariaSort}>
      Trier
    </button>
  );
};

export const SortButton = memo(SortButtonComponent, (prev, next) => {
  // Wasn't active
  if (prev.sort !== prev.sortKey && next.sort !== next.sortKey) return true;

  return prev.sort === next.sort && prev.sortKey === next.sortKey && prev.sortDirection === next.sortDirection;
}) as typeof SortButtonComponent;
