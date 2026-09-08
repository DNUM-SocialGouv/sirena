import { REPONSE_OUI_NON } from '@sirena/common/constants';
import type { ReponseOuiNon, ReponseOuiNonValue } from '@sirena/common/schemas';
import { REPONSE_NON_RENSEIGNE_LABEL } from '@sirena/common/utils';

type RadioOption = {
  label: string;
  nativeInputProps: {
    value: string;
    checked: boolean;
    onChange: () => void;
  };
};

export const buildNonRenseigneOption = (checked: boolean, onChange: () => void): RadioOption => ({
  label: REPONSE_NON_RENSEIGNE_LABEL,
  nativeInputProps: {
    value: REPONSE_OUI_NON.NON_RENSEIGNE,
    checked,
    onChange,
  },
});

export const buildOuiNonOptions = (
  value: ReponseOuiNonValue,
  onChange: (value: ReponseOuiNon) => void,
): RadioOption[] => [
  {
    label: 'Oui',
    nativeInputProps: {
      value: REPONSE_OUI_NON.OUI,
      checked: value === REPONSE_OUI_NON.OUI,
      onChange: () => onChange(REPONSE_OUI_NON.OUI),
    },
  },
  {
    label: 'Non',
    nativeInputProps: {
      value: REPONSE_OUI_NON.NON,
      checked: value === REPONSE_OUI_NON.NON,
      onChange: () => onChange(REPONSE_OUI_NON.NON),
    },
  },
  buildNonRenseigneOption(value === REPONSE_OUI_NON.NON_RENSEIGNE, () => onChange(REPONSE_OUI_NON.NON_RENSEIGNE)),
];
