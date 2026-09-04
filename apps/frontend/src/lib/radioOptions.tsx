import { fr } from '@codegouvfr/react-dsfr';
import { REPONSE_OUI_NON } from '@sirena/common/constants';
import type { ReponseOuiNon, ReponseOuiNonValue } from '@sirena/common/schemas';
import { REPONSE_NON_RENSEIGNE_LABEL } from '@sirena/common/utils';
import type { ReactNode } from 'react';

type RadioOption = {
  label: ReactNode;
  nativeInputProps: {
    value: string;
    checked: boolean;
    onChange: () => void;
  };
};

const withGroupContext = (label: string, groupLabel: string | undefined): ReactNode => {
  if (!groupLabel) return label;

  return (
    <>
      {label}
      <span className={fr.cx('fr-sr-only')}> — {groupLabel}</span>
    </>
  );
};

export const buildNonRenseigneOption = (checked: boolean, onChange: () => void, groupLabel?: string): RadioOption => ({
  label: withGroupContext(REPONSE_NON_RENSEIGNE_LABEL, groupLabel),
  nativeInputProps: {
    value: REPONSE_OUI_NON.NON_RENSEIGNE,
    checked,
    onChange,
  },
});

export const buildOuiNonOptions = (
  value: ReponseOuiNonValue,
  onChange: (value: ReponseOuiNon) => void,
  groupLabel?: string,
): RadioOption[] => [
  {
    label: withGroupContext('Oui', groupLabel),
    nativeInputProps: {
      value: REPONSE_OUI_NON.OUI,
      checked: value === REPONSE_OUI_NON.OUI,
      onChange: () => onChange(REPONSE_OUI_NON.OUI),
    },
  },
  {
    label: withGroupContext('Non', groupLabel),
    nativeInputProps: {
      value: REPONSE_OUI_NON.NON,
      checked: value === REPONSE_OUI_NON.NON,
      onChange: () => onChange(REPONSE_OUI_NON.NON),
    },
  },
  buildNonRenseigneOption(
    value === REPONSE_OUI_NON.NON_RENSEIGNE,
    () => onChange(REPONSE_OUI_NON.NON_RENSEIGNE),
    groupLabel,
  ),
];
