import { useCallback } from 'react';
import { fetchOrganizations, type Organization } from '@/lib/api/fetchOrganizations';
import styles from './OrganizationSearchField.module.css';
import { SearchField } from './SearchField';

interface OrganizationSearchFieldProps {
  value?: string;
  onChange: (value: string, organization?: Organization) => void;
  label?: string;
  hintText?: string;
  state?: 'default' | 'success' | 'info' | 'error';
  stateRelatedMessage?: React.ReactNode;
  disabled?: boolean;
  searchMode: 'finess' | 'name';
  minSearchLength?: number;
  debounceMs?: number;
}

const buildOrganizationQuery = (searchTerm: string, mode: 'finess' | 'name') => {
  return mode === 'finess' ? { identifier: searchTerm.trim() } : { name: searchTerm };
};

const renderOrganizationItem = (organization: Organization) => (
  <div className={styles.itemContent}>
    <div className={styles.itemName}>
      <strong>{organization.name}</strong>
    </div>
    <div className={styles.itemDetails}>
      <span className={styles.itemIdentifier}>FINESS: {organization.identifier}</span>
      {organization.addressCity && organization.addressPostalcode ? (
        <span className={styles.itemAddress}>
          {organization.addressPostalcode} {organization.addressCity}
        </span>
      ) : null}
    </div>
  </div>
);

const getOrganizationItemKey = (organization: Organization) => organization.identifier;

export function OrganizationSearchField({
  value = '',
  onChange,
  label,
  hintText,
  state = 'default',
  stateRelatedMessage,
  disabled,
  searchMode,
  minSearchLength = 3,
  debounceMs = 300,
}: OrganizationSearchFieldProps) {
  const fetchFn = useCallback(
    (searchTerm: string) => fetchOrganizations(buildOrganizationQuery(searchTerm, searchMode)),
    [searchMode],
  );

  const formatDisplay = useCallback(
    (organization: Organization) => {
      if (searchMode === 'finess') {
        return organization.identifier;
      }
      if (searchMode === 'name') {
        return organization.name;
      }
      const addressPart =
        organization.addressCity && organization.addressPostalcode
          ? ` - ${organization.addressPostalcode} ${organization.addressCity}`
          : '';
      return `${organization.name} (FINESS: ${organization.identifier})${addressPart}`;
    },
    [searchMode],
  );

  const getItemId = useCallback(
    (organization: Organization) => {
      if (searchMode === 'finess') {
        return organization.identifier;
      }
      if (searchMode === 'name') {
        return organization.name;
      }
      return organization.identifier;
    },
    [searchMode],
  );

  return (
    <SearchField<Organization>
      value={value}
      onChange={onChange}
      label={label || "Nom de l'établissement ou numéro FINESS"}
      hintText={hintText}
      state={state}
      stateRelatedMessage={stateRelatedMessage}
      disabled={disabled}
      queryKey="organizations"
      fetchFn={fetchFn}
      formatDisplay={formatDisplay}
      renderItem={renderOrganizationItem}
      getItemKey={getOrganizationItemKey}
      getItemId={getItemId}
      noResultsMessage="Aucune organisation trouvée"
      minSearchLength={minSearchLength}
      debounceMs={debounceMs}
    />
  );
}
