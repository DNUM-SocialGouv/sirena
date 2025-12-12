import { Button } from '@codegouvfr/react-dsfr/Button';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { Select } from '@codegouvfr/react-dsfr/Select';
import { RECEPTION_TYPE, type ReceptionType, receptionTypeLabels } from '@sirena/common/constants';
import { useEffect, useMemo, useState } from 'react';

type OriginalRequestSectionProps = {
  receptionDate?: string | null;
  receptionTypeId?: ReceptionType | null;
  disabled?: boolean;
};

const formatDateForInput = (value?: string | Date | null) => {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toISOString().split('T')[0];
};

export const OriginalRequestSection = ({
  receptionDate,
  receptionTypeId,
  disabled = false,
}: OriginalRequestSectionProps) => {
  const [dateValue, setDateValue] = useState<string>('');
  const [typeValue, setTypeValue] = useState<ReceptionType | ''>('');

  const receptionOptions = useMemo(
    () =>
      Object.values(RECEPTION_TYPE).map((value) => ({
        value,
        label: receptionTypeLabels[value as ReceptionType],
      })),
    [],
  );

  useEffect(() => {
    setDateValue(formatDateForInput(receptionDate));
  }, [receptionDate]);

  useEffect(() => {
    setTypeValue(receptionTypeId ?? '');
  }, [receptionTypeId]);

  return (
    <form
      className="fr-p-4w fr-mb-4w"
      style={{ border: '1px solid var(--border-default-grey)', borderRadius: '0.25rem' }}
      onSubmit={(event) => event.preventDefault()}
    >
      <h2 className="fr-h6 fr-mb-3w">Requête originale</h2>
      <div className="fr-grid-row fr-grid-row--gutters">
        <div className="fr-col-12 fr-col-md-6">
          <Input
            label="Date de réception"
            hintText="Format attendu : JJ-MM-AAAA"
            nativeInputProps={{
              type: 'date',
              value: dateValue,
              onChange: (event) => setDateValue(event.target.value),
              disabled,
            }}
          />
        </div>
        <div className="fr-col-12 fr-col-md-6">
          <Select
            label="Mode de réception"
            nativeSelectProps={{
              value: typeValue,
              onChange: (event) => setTypeValue((event.target.value as ReceptionType) || ''),
              disabled,
            }}
          >
            <option value="">Sélectionnez une option</option>
            {receptionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="fr-mt-3w">
        <Button type="submit" disabled={disabled}>
          Valider
        </Button>
      </div>
    </form>
  );
};
