import { fetchPractitioners, type Practitioner } from '@/lib/api/fetchPractitioners';
import styles from './PractitionerSearchField.module.css';
import { SearchField } from './SearchField';

interface PractitionerSearchFieldProps {
  value?: string;
  onChange: (value: string, practitioner?: Practitioner) => void;
  label?: string;
  disabled?: boolean;
}

export function PractitionerSearchField({ value = '', onChange, label, disabled }: PractitionerSearchFieldProps) {
  const fetchFn = async (searchTerm: string, isNumeric: boolean) => {
    return fetchPractitioners(isNumeric ? { identifier: searchTerm.trim() } : { fullName: searchTerm });
  };

  const formatDisplay = (practitioner: Practitioner) => {
    const prefix = practitioner.prefix ? `${practitioner.prefix} ` : '';
    return `${prefix}${practitioner.fullName} (RPPS: ${practitioner.rpps})`;
  };

  const renderItem = (practitioner: Practitioner) => (
    <div className={styles.itemContent}>
      <div className={styles.itemName}>
        {practitioner.prefix && <span className={styles.prefix}>{practitioner.prefix} </span>}
        <strong>{practitioner.fullName}</strong>
      </div>
      <div className={styles.itemRpps}>RPPS: {practitioner.rpps}</div>
    </div>
  );

  return (
    <SearchField<Practitioner>
      value={value}
      onChange={onChange}
      label={label || 'Identité du professionnel ou numéro RPPS'}
      disabled={disabled}
      queryKey="practitioners"
      fetchFn={fetchFn}
      formatDisplay={formatDisplay}
      renderItem={renderItem}
      getItemKey={(practitioner) => practitioner.rpps}
      getItemId={(practitioner) => practitioner.rpps}
      noResultsMessage="Aucun praticien trouvé"
    />
  );
}
