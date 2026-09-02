import styles from './AccordionMultiSelect.module.css';
import type { AccordionMultiSelectOption } from './AccordionMultiSelect.types';

interface OptionCheckboxProps {
  option: AccordionMultiSelectOption;
  inputId: string;
  name: string;
  checked: boolean;
  hasError?: boolean;
  onToggle: () => void;
}

export const OptionCheckbox = ({ option, inputId, name, checked, hasError, onToggle }: OptionCheckboxProps) => (
  <div className={`fr-checkbox-group${hasError ? ' fr-checkbox-group--error' : ''} ${styles.checkboxGroup}`}>
    <input type="checkbox" id={inputId} name={name} value={option.value} checked={checked} onChange={onToggle} />
    <label className="fr-label" htmlFor={inputId}>
      {option.label}
      {option.description ? <span className="fr-hint-text">{option.description}</span> : null}
    </label>
  </div>
);
