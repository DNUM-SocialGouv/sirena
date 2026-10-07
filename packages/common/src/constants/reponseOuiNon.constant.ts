export const REPONSE_OUI_NON = {
  OUI: 'OUI',
  NON: 'NON',
  NON_RENSEIGNE: 'NON_RENSEIGNE',
} as const;

export const reponseOuiNonLabels: Record<keyof typeof REPONSE_OUI_NON, string> = {
  [REPONSE_OUI_NON.OUI]: 'Oui',
  [REPONSE_OUI_NON.NON]: 'Non',
  [REPONSE_OUI_NON.NON_RENSEIGNE]: 'Non renseigné',
} as const;
