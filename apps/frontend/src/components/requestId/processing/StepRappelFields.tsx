import { Input } from '@codegouvfr/react-dsfr/Input';
import Select from '@codegouvfr/react-dsfr/Select';
import {
  REQUETE_ETAPE_RAPPEL_TYPES,
  type RequeteEtapeRappelType,
  requeteEtapeRappelType,
} from '@sirena/common/constants';
import { useCallback } from 'react';
import styles from './StepFormPanel.module.css';

export const RAPPEL_DISABLED = '' as const;
export type RappelSelectValue = RequeteEtapeRappelType | typeof RAPPEL_DISABLED;

const RAPPEL_DELAI_TYPES = [
  REQUETE_ETAPE_RAPPEL_TYPES.JOURS_7,
  REQUETE_ETAPE_RAPPEL_TYPES.JOURS_15,
  REQUETE_ETAPE_RAPPEL_TYPES.JOURS_30,
] as const;

const isRappelType = (value: string): value is RequeteEtapeRappelType => value in requeteEtapeRappelType;

export const toRappelSelectValue = (value: string | null | undefined): RappelSelectValue =>
  value && isRappelType(value) ? value : RAPPEL_DISABLED;

export const toRappelInputDate = (value: string | Date | null | undefined): string => {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const [datePart] = value.split('T');
  return /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : '';
};

type StepRappelFieldsProps = {
  rappelType: RappelSelectValue;
  rappelDate: string;
  dateError: string | null;
  disabled: boolean;
  dateInputRef: React.RefObject<HTMLInputElement | null>;
  onTypeChange: (value: RappelSelectValue) => void;
  onDateChange: (value: string) => void;
};

export const StepRappelFields = ({
  rappelType,
  rappelDate,
  dateError,
  disabled,
  dateInputRef,
  onTypeChange,
  onDateChange,
}: StepRappelFieldsProps) => {
  const handleTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => onTypeChange(toRappelSelectValue(e.target.value)),
    [onTypeChange],
  );

  const handleDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onDateChange(e.target.value),
    [onDateChange],
  );

  return (
    <>
      <div className={styles.fieldBlock}>
        <Select
          label="Mettre un rappel pour cette étape (alertes, relances etc.)"
          disabled={disabled}
          nativeSelectProps={{ value: rappelType, onChange: handleTypeChange }}
        >
          <option value={RAPPEL_DISABLED}>Désactivé</option>
          <optgroup label="Rappeler cette étape dans :">
            {RAPPEL_DELAI_TYPES.map((type) => (
              <option key={type} value={type}>
                {requeteEtapeRappelType[type]}
              </option>
            ))}
          </optgroup>
          <option value={REQUETE_ETAPE_RAPPEL_TYPES.PERSONNALISE}>{requeteEtapeRappelType.PERSONNALISE}</option>
        </Select>
      </div>

      {rappelType === REQUETE_ETAPE_RAPPEL_TYPES.PERSONNALISE && (
        <div className={styles.fieldBlock}>
          <Input
            label="Rappeler cette étape le (champ obligatoire)"
            hintText="Format attendu : JJ-MM-AAAA"
            disabled={disabled}
            state={dateError ? 'error' : 'default'}
            stateRelatedMessage={dateError ?? undefined}
            nativeInputProps={{
              ref: dateInputRef,
              type: 'date',
              value: rappelDate,
              onChange: handleDateChange,
            }}
          />
        </div>
      )}
    </>
  );
};
