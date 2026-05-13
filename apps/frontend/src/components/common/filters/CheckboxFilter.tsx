import { useId } from 'react';
import './CheckboxFilter.css';

type Props = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  groupLegend?: string;
};

export function CheckboxFilter({ label, checked, onChange, groupLegend = 'Filtres rapides' }: Props) {
  const inputId = useId();

  return (
    <fieldset className="checkbox-filter fr-fieldset">
      <legend className="fr-sr-only">{groupLegend}</legend>
      <div className="fr-checkbox-group">
        <input type="checkbox" id={inputId} checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <label className="fr-label" htmlFor={inputId}>
          {label}
        </label>
      </div>
    </fieldset>
  );
}
