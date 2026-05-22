import { useMemo } from 'react';
import { DropdownCheckboxFilter } from './DropdownCheckboxFilter';

type Departement = { code: string; label: string };
type CountsMap = Record<string, number>;

type Props = {
  departements: Departement[];
  selectedCodes: string[];
  counts: CountsMap | null;
  onChange: (codes: string[]) => void;
  onOpen?: () => void;
  onClose?: () => void;
};

export function DepartementFilter({ departements, selectedCodes, counts, onChange, onOpen, onClose }: Props) {
  const options = useMemo(
    () =>
      departements.map((dept) => {
        const count = counts?.[dept.code];

        return {
          value: dept.code,
          label: `${dept.code} - ${dept.label}${count !== undefined ? ` (${count})` : ''}`,
        };
      }),
    [departements, counts],
  );

  return (
    <DropdownCheckboxFilter
      buttonLabel="Département"
      legend="Filtrer les requêtes par département"
      hintText="Code - Département (nombre de requêtes)"
      options={options}
      selectedValues={selectedCodes}
      onChange={onChange}
      onOpen={onOpen}
      onClose={onClose}
    />
  );
}
