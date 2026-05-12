import { Checkbox } from '@codegouvfr/react-dsfr/Checkbox';

type FilterCheckboxProps = {
  name: string;
  value: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
};

export function FilterCheckbox({ name, value, label, checked, onChange, className }: FilterCheckboxProps) {
  return (
    <Checkbox
      small
      className={className}
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
