import styles from './ReadOnlyField.module.css';

type ReadOnlyFieldProps = {
  id: string;
  label: string;
  value: string;
  hintText?: string;
};

export function ReadOnlyField({ id, label, value, hintText }: ReadOnlyFieldProps) {
  return (
    <div className="fr-input-group">
      <label className="fr-label" htmlFor={id}>
        {label}
        {hintText ? <span className="fr-hint-text">{hintText}</span> : null}
      </label>
      <input id={id} className={styles.readOnlyValue} value={value} readOnly />
    </div>
  );
}
