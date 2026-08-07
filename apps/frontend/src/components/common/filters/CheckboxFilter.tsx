import { useCallback, useId } from 'react';
import './CheckboxFilter.css';

type Props = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function CheckboxFilter({ label, checked, onChange }: Props) {
  const inputId = useId();

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.checked);
    },
    [onChange],
  );

  return (
    <div className="checkbox-filter">
      <div className="fr-checkbox-group">
        <input type="checkbox" id={inputId} checked={checked} onChange={handleChange} />
        <label className="fr-label" htmlFor={inputId}>
          {label}
        </label>
      </div>
    </div>
  );
}
