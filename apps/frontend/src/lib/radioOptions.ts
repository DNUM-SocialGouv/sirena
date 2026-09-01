export const NON_RENSEIGNE_LABEL = 'Non renseigné';

type RadioOption = {
  label: string;
  nativeInputProps: {
    value: string;
    checked: boolean;
    onChange: () => void;
  };
};

export const buildNonRenseigneOption = (checked: boolean, onChange: () => void): RadioOption => ({
  label: NON_RENSEIGNE_LABEL,
  nativeInputProps: {
    value: '',
    checked,
    onChange,
  },
});

export const buildOuiNonOptions = (
  value: boolean | null | undefined,
  onChange: (value: boolean | null) => void,
): RadioOption[] => [
  {
    label: 'Oui',
    nativeInputProps: {
      value: 'true',
      checked: value === true,
      onChange: () => onChange(true),
    },
  },
  {
    label: 'Non',
    nativeInputProps: {
      value: 'false',
      checked: value === false,
      onChange: () => onChange(false),
    },
  },
  buildNonRenseigneOption(value == null, () => onChange(null)),
];
