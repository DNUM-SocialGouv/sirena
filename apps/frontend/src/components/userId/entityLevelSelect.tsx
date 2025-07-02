import Select from '@codegouvfr/react-dsfr/Select';
import { memo } from 'react';
import { useEntites } from '@/hooks/queries/useEntite';

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
}: EntityLevelSelectProps) {
  const { data: entites } = useEntites(parentLevel);

  return (
    <Select
      className="fr-fieldset__content"
      label={label}
      nativeSelectProps={{
        name,
        value: level,
        onChange: (e) => setLevel(e.target.value),
      }}
    >
      <option value="">{nullPlaceholder}</option>
      {entites?.map((entite) => (
        <option key={entite.id} value={entite.id}>
          {entite.nomComplet}
        </option>
      ))}
    </Select>
  );
}

export const EntityLevelSelect = memo(EntityLevelSelectComponent);
