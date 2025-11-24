import { fetchPractitioners, type Practitioner } from '@/lib/api/fetchPractitioners';
import styles from './PractitionerSearchField.module.css';
import { SearchField } from './SearchField';

interface PractitionerSearchFieldProps {
  value?: string;
  onChange: (value: string, practitioner?: Practitioner) => void;
  label?: string;
  hintText?: string;
  disabled?: boolean;
  searchMode: 'rpps' | 'name';
  minSearchLength?: number;
  debounceMs?: number;
}

const buildPractitionerQuery = (searchTerm: string, mode: 'rpps' | 'name') => {
  return mode === 'rpps' ? { identifier: searchTerm.trim() } : { fullName: searchTerm };
};

export function PractitionerSearchField({
  value = '',
  onChange,
  label,
  hintText,
  disabled,
  searchMode,
  minSearchLength = 3,
  debounceMs = 300,
}: PractitionerSearchFieldProps) {
  const fetchFn = (searchTerm: string) => fetchPractitioners(buildPractitionerQuery(searchTerm, searchMode));

  const formatDisplay = (practitioner: Practitioner) => {
    if (searchMode === 'rpps') {
      return practitioner.rpps;
    }
    if (searchMode === 'name') {
      const prefix = practitioner.prefix ? `${practitioner.prefix} ` : '';
      return `${prefix}${practitioner.fullName}`;
    }
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

  const getItemId = (practitioner: Practitioner) => {
    if (searchMode === 'rpps') {
      return practitioner.rpps;
    }
    if (searchMode === 'name') {
      const prefix = practitioner.prefix ? `${practitioner.prefix} ` : '';
      return `${prefix}${practitioner.fullName}`;
    }
    return practitioner.rpps;
  };

  return (
    <SearchField<Practitioner>
      value={value}
      onChange={onChange}
      label={label || 'Identité du professionnel ou numéro RPPS'}
      hintText={hintText}
      disabled={disabled}
      queryKey="practitioners"
      fetchFn={fetchFn}
      formatDisplay={formatDisplay}
      renderItem={renderItem}
      getItemKey={(practitioner) => practitioner.rpps}
      getItemId={getItemId}
      noResultsMessage="Aucun praticien trouvé"
      minSearchLength={minSearchLength}
      debounceMs={debounceMs}
    />
  );
}
