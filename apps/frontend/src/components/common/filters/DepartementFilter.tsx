import { Checkbox } from '@codegouvfr/react-dsfr/Checkbox';
import { Menu } from '@sirena/ui';
import { useCallback, useState } from 'react';
import './DepartementFilter.css';

type Departement = { code: string; label: string };
type CountsMap = Record<string, number>;

type Props = {
  regionLabel: string | null;
  departements: Departement[];
  selectedCodes: string[];
  counts: CountsMap | null;
  onChange: (codes: string[]) => void;
  onOpen?: () => void;
  onClose?: () => void;
};

export function DepartementFilter({
  regionLabel,
  departements,
  selectedCodes,
  counts,
  onChange,
  onOpen,
  onClose,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open);
      if (open) onOpen?.();
      else onClose?.();
    },
    [onOpen, onClose],
  );

  const handleCheckboxChange = useCallback(
    (code: string, checked: boolean) => {
      const next = checked ? [...selectedCodes, code] : selectedCodes.filter((c) => c !== code);
      onChange(next);
    },
    [selectedCodes, onChange],
  );

  const hasSelection = selectedCodes.length > 0;

  return (
    <Menu.Root onOpenChange={handleOpenChange}>
      <Menu.Trigger
        isOpen={isOpen}
        className={`departement-filter__button fr-btn${hasSelection ? '' : ' fr-btn--tertiary'}`}
      >
        Département
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="start">
          <Menu.Popup className="departement-filter__dropdown">
            {regionLabel && <p className="departement-filter__region-label fr-text--bold fr-mb-1v">{regionLabel}</p>}
            <p className="departement-filter__hint fr-text--xs fr-mb-1w">Code-Département (nombre de requêtes)</p>
            <Checkbox
              legend="Départements"
              options={departements.map((dept) => {
                const count = counts?.[dept.code];
                const label = `${dept.code}-${dept.label}${count !== undefined ? ` (${count})` : ''}`;
                return {
                  label,
                  nativeInputProps: {
                    value: dept.code,
                    checked: selectedCodes.includes(dept.code),
                    onChange: (e) => handleCheckboxChange(dept.code, e.target.checked),
                  },
                };
              })}
            />
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
