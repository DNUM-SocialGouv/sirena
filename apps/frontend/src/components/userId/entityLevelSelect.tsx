import Select from '@codegouvfr/react-dsfr/Select';
import type React from 'react';
import { memo, useId } from 'react';
import { ReadOnlyField } from '@/components/common/ReadOnlyField';
import { useEntites } from '@/hooks/queries/entites.hook';

type EntityLevelSelectProps = {
  parentLevel: string | undefined;
  level: string;
  label: string;
  name: string;
  nullPlaceholder: string;
  setLevel: (level: string) => void;
};

export function EntityLevelSelectComponent({
  level,
  setLevel,
  name,
  label,
  nullPlaceholder,
  parentLevel,
  disabled,
}: EntityLevelSelectProps & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const generatedId = useId();
  const { data: response } = useEntites(parentLevel);

  if (disabled) {
    const selectedLabel = response?.data?.find((entite) => entite.id === level)?.nomComplet ?? '';
    return (
      <ReadOnlyField
        id={`${generatedId}-${name}`}
        className="fr-fieldset__content"
        label={label}
        hintText="Ce champ n’est pas modifiable ici."
        value={selectedLabel}
      />
    );
  }

  return (
    <Select
      className="fr-fieldset__content"
      label={label}
      disabled={disabled}
      nativeSelectProps={{
        name,
        value: level,
        onChange: (e) => setLevel(e.target.value),
      }}
    >
      <option value="">{nullPlaceholder}</option>
      {response?.data?.map((entite) => (
        <option key={entite.id} value={entite.id}>
          {entite.nomComplet}
        </option>
      ))}
    </Select>
  );
}

export const EntityLevelSelect = memo(EntityLevelSelectComponent);
