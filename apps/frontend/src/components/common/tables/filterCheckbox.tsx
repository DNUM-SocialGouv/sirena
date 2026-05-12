import { Checkbox } from '@codegouvfr/react-dsfr/Checkbox';

type FilterCheckboxProps = {
  name: string;
  value: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function FilterCheckbox({ name, value, label, checked, onChange }: FilterCheckboxProps) {
  return (
    <Checkbox
      small
      className="requetesEntitesTable__filter-item"
      options={[
        {
          label,
          nativeInputProps: {
            name,
            value,
            checked,
            onChange: (event) => onChange(event.target.checked),
          },
        },
      ]}
    />
  );
}
