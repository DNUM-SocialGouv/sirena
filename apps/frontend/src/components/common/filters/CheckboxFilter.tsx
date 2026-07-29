import { useCallback, useId } from 'react';
import './CheckboxFilter.css';

type Props = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  groupLegend?: string;
};

export function CheckboxFilter({ label, checked, onChange, groupLegend = 'Filtres rapides' }: Props) {
  const inputId = useId();

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.checked);
    },
    [onChange],
  );

  return (
    <fieldset className="checkbox-filter fr-fieldset">
      <legend className="fr-sr-only">{groupLegend}</legend>
      <div className="fr-checkbox-group">
        <input type="checkbox" id={inputId} checked={checked} onChange={handleChange} />
        <label className="fr-label" htmlFor={inputId}>
          {label}
        </label>
      </div>
    </fieldset>
  );
}
