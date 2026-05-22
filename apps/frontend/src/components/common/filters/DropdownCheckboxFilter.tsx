import { Checkbox } from '@codegouvfr/react-dsfr/Checkbox';
import { useCallback, useId, useRef, useState } from 'react';
import './DropdownCheckboxFilter.css';

type Option = {
  value: string;
  label: string;
};

type Props = {
  buttonLabel: string;
  legend: string;
  hintText: string;
  options: Option[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
};

export function DropdownCheckboxFilter({ buttonLabel, legend, hintText, options, selectedValues, onChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const hasSelection = selectedValues.length > 0;

  const handleCheckboxChange = useCallback(
    (value: string, checked: boolean) => {
      const next = checked
        ? [...selectedValues, value]
        : selectedValues.filter((selectedValue) => selectedValue !== value);
      onChange(next);
    },
    [selectedValues, onChange],
  );

  return (
    <div className="dropdown-checkbox-filter">
      <button
        ref={triggerRef}
        type="button"
        className="dropdown-checkbox-filter__button fr-btn fr-btn--tertiary"
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={() => setIsOpen((value) => !value)}
      >
        <span>
          {buttonLabel}
          {hasSelection && (
            <span>
              {' '}
              <span>({selectedValues.length})</span>
              <span className="fr-sr-only"> sélectionnés</span>
            </span>
          )}
        </span>
        <span
          aria-hidden="true"
          className={`fr-icon-arrow-down-s-line menu__trigger__icon${isOpen ? ' menu__trigger__icon--is-open' : ''}`}
        />
      </button>

      {isOpen && (
        <div id={menuId} className="dropdown-checkbox-filter__dropdown fr-card fr-px-3w fr-py-2w">
          <Checkbox
            legend={legend}
            hintText={hintText}
            options={options.map((option) => ({
              label: option.label,
              nativeInputProps: {
                value: option.value,
                checked: selectedValues.includes(option.value),
                onChange: (e) => handleCheckboxChange(option.value, e.target.checked),
              },
            }))}
          />
        </div>
      )}
    </div>
  );
}
