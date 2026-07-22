import { useMemo } from 'react';
import { DropdownCheckboxFilter } from './DropdownCheckboxFilter';

type RootEntite = {
  id: string;
  nomComplet: string;
  label: string;
};

type Props = {
  rootEntites: RootEntite[];
  selectedRootEntiteIds: string[];
  onChange: (rootEntiteIds: string[]) => void;
};

const selectedValuesLabel = (count: number) =>
  `entité${count > 1 ? 's' : ''} administrative${count > 1 ? 's' : ''} sélectionnée${count > 1 ? 's' : ''}`;

export function RootEntitesFilter({ rootEntites, selectedRootEntiteIds, onChange }: Props) {
  const options = useMemo(
    () =>
      rootEntites.map((rootEntite) => ({
        value: rootEntite.id,
        label: rootEntite.nomComplet,
      })),
    [rootEntites],
  );

  return (
    <DropdownCheckboxFilter
      buttonLabel="Entité administrative"
      selectedValuesLabel={selectedValuesLabel}
      legend="Filtrer les entités par entité administrative"
      hintText="Entité administrative"
      options={options}
      selectedValues={selectedRootEntiteIds}
      onChange={onChange}
    />
  );
}
