import { fetchOrganizations, type Organization } from '@/lib/api/fetchOrganizations';
import styles from './OrganizationSearchField.module.css';
import { SearchField } from './SearchField';

interface OrganizationSearchFieldProps {
  value?: string;
  onChange: (value: string, organization?: Organization) => void;
  label?: string;
  disabled?: boolean;
}

export function OrganizationSearchField({ value = '', onChange, label, disabled }: OrganizationSearchFieldProps) {
  const fetchFn = async (searchTerm: string, isNumeric: boolean) => {
    return fetchOrganizations(isNumeric ? { identifier: searchTerm.trim() } : { name: searchTerm });
  };

  const formatDisplay = (organization: Organization) => {
    const addressPart =
      organization.addressCity && organization.addressPostalcode
        ? ` - ${organization.addressPostalcode} ${organization.addressCity}`
        : '';
    return `${organization.name} (FINESS: ${organization.identifier})${addressPart}`;
  };

  const renderItem = (organization: Organization) => (
    <div className={styles.itemContent}>
      <div className={styles.itemName}>
        <strong>{organization.name}</strong>
      </div>
      <div className={styles.itemDetails}>
        <span className={styles.itemIdentifier}>FINESS: {organization.identifier}</span>
        {organization.addressCity && organization.addressPostalcode && (
          <span className={styles.itemAddress}>
            {organization.addressPostalcode} {organization.addressCity}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <SearchField<Organization>
      value={value}
      onChange={onChange}
      label={label || "Nom de l'établissement ou numéro FINESS"}
      disabled={disabled}
      queryKey="organizations"
      fetchFn={fetchFn}
      formatDisplay={formatDisplay}
      renderItem={renderItem}
      getItemKey={(org) => org.identifier}
      getItemId={(org) => org.identifier}
      noResultsMessage="Aucune organisation trouvée"
    />
  );
}
