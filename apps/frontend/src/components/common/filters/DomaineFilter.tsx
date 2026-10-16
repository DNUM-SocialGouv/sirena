import { domainesFonctionnelsLabels } from '@sirena/common/constants';
import { useMemo } from 'react';
import { DropdownCheckboxFilter } from './DropdownCheckboxFilter';
import { withNonRenseigneOption } from './nonRenseigne';

type CountsMap = Record<string, number>;

const selectedValuesLabel = (count: number) => `domaine${count > 1 ? 's' : ''} sélectionné${count > 1 ? 's' : ''}`;

type Props = {
  selectedIds: string[];
  counts?: CountsMap | null;
  legend?: string;
  onChange: (ids: string[]) => void;
  onOpen?: () => void;
  onClose?: () => void;
};

export function DomaineFilter({
  selectedIds,
  counts,
  legend = 'Filtrer les requêtes par domaine fonctionnel',
  onChange,
  onOpen,
  onClose,
}: Props) {
  // « Non renseigné » reste en tête, hors du tri alphabétique : ce n'est pas un domaine du
  // référentiel mais l'absence de domaine.
  const options = useMemo(
    () =>
      withNonRenseigneOption(
        Object.entries(domainesFonctionnelsLabels)
          .sort(([, a], [, b]) => a.localeCompare(b, 'fr'))
          .map(([id, label]) => {
            const count = counts?.[id];
            return {
              value: id,
              label: `${label}${count !== undefined ? ` (${count})` : ''}`,
            };
          }),
        counts,
      ),
    [counts],
  );

  return (
    <DropdownCheckboxFilter
      buttonLabel="Domaine fonctionnel"
      selectedValuesLabel={selectedValuesLabel}
      legend={legend}
      hintText={counts === undefined ? undefined : 'Domaine fonctionnel (nombre de requêtes)'}
      options={options}
      selectedValues={selectedIds}
      onChange={onChange}
      onOpen={onOpen}
      onClose={onClose}
    />
  );
}
