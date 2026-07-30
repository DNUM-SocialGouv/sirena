import { Checkbox } from '@codegouvfr/react-dsfr/Checkbox';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { useCallback, useId, useState } from 'react';
import type { Address } from '@/lib/api/fetchAddresses';
import { AddressSearchField } from './AddressSearchField';

export interface DomicileValues {
  adresseDomicile: string;
  codePostal: string;
  ville: string;
}

interface DomicileFieldsProps {
  values: DomicileValues;
  onChange: (values: DomicileValues) => void;
  labels: {
    adresseDomicile: string;
    codePostal: string;
    ville: string;
  };
}

const MANUAL_TOGGLE_LABEL = "Remplir l'adresse manuellement";

// Combines the stored fields into the single line displayed in the search input.
const toDisplayValue = ({ adresseDomicile, codePostal, ville }: DomicileValues): string => {
  const location = [codePostal, ville].filter(Boolean).join(' ').trim();
  return [adresseDomicile, location].filter(Boolean).join(', ');
};

/**
 * Maps a selected BAN address to the stored fields: a city fills only the
 * postcode and city, a street/housenumber/locality fills all three.
 */
export const addressToDomicileValues = (address: Address): DomicileValues => ({
  adresseDomicile: address.type === 'municipality' ? '' : address.name,
  codePostal: address.postcode,
  ville: address.city,
});

export function DomicileFields({ values, onChange, labels }: DomicileFieldsProps) {
  const [isManual, setIsManual] = useState(false);
  const manualFieldsId = useId();

  const handleSelect = useCallback(
    (address: Address) => {
      onChange(addressToDomicileValues(address));
    },
    [onChange],
  );

  const handleClear = useCallback(() => {
    onChange({ adresseDomicile: '', codePostal: '', ville: '' });
  }, [onChange]);

  const handleFieldChange = (field: keyof DomicileValues) => (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...values, [field]: e.target.value });
  };

  return (
    <>
      <div className="fr-grid-row fr-grid-row--gutters fr-mb-3w">
        <div className="fr-col-12 fr-col-md-6">
          <AddressSearchField
            value={toDisplayValue(values)}
            onSelect={handleSelect}
            onClear={handleClear}
            label="Domicile"
            disabled={isManual}
          />
        </div>
        <div className="fr-col-12 fr-col-md-6" style={{ display: 'flex', alignItems: 'flex-end' }}>
          <Checkbox
            options={[
              {
                label: MANUAL_TOGGLE_LABEL,
                nativeInputProps: {
                  checked: isManual,
                  onChange: (e) => setIsManual(e.target.checked),
                  'aria-expanded': isManual,
                  'aria-controls': manualFieldsId,
                },
              },
            ]}
          />
        </div>
      </div>

      {/* Always rendered so aria-controls resolves even when collapsed. */}
      <div id={manualFieldsId} hidden={!isManual}>
        <p
          className="fr-text--sm fr-mb-2w"
          style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', color: 'var(--text-default-info)' }}
        >
          <span
            className="fr-icon-info-fill fr-icon--sm"
            aria-hidden="true"
            style={{ color: 'var(--text-default-info)', flexShrink: 0 }}
          />
          <span>Pour rechercher le domicile, décochez la case « {MANUAL_TOGGLE_LABEL} »</span>
        </p>
        <div className="fr-grid-row fr-grid-row--gutters">
          <div className="fr-col-12 fr-col-md-6">
            <Input
              label={labels.adresseDomicile}
              nativeInputProps={{
                value: values.adresseDomicile,
                onChange: handleFieldChange('adresseDomicile'),
              }}
            />
          </div>
          <div className="fr-col-12 fr-col-md-2">
            <Input
              label={labels.codePostal}
              nativeInputProps={{
                value: values.codePostal,
                onChange: handleFieldChange('codePostal'),
                maxLength: 5,
              }}
            />
          </div>
          <div className="fr-col-12 fr-col-md-4">
            <Input
              label={labels.ville}
              nativeInputProps={{
                value: values.ville,
                onChange: handleFieldChange('ville'),
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
