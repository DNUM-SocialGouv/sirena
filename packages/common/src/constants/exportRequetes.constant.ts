export const EXPORT_REQUETES_MAX_PERIOD_MONTHS = 36;

export const EXPORT_REQUETES_ERROR_CODES = {
  START_DATE_REQUIRED: 'START_DATE_REQUIRED',
  END_DATE_REQUIRED: 'END_DATE_REQUIRED',
  START_AFTER_END: 'START_AFTER_END',
  END_DATE_IN_FUTURE: 'END_DATE_IN_FUTURE',
  PERIOD_TOO_LONG: 'PERIOD_TOO_LONG',
  NO_REQUETE: 'NO_REQUETE',
  EXPORT_IN_PROGRESS: 'EXPORT_IN_PROGRESS',
} as const;

export type ExportRequetesErrorCode = (typeof EXPORT_REQUETES_ERROR_CODES)[keyof typeof EXPORT_REQUETES_ERROR_CODES];

// Wording from the SIRENA-915 ticket. A future end date shows the same message as a start date
// after the end date, as the ticket asks for twice (business rule and CA6).
export const EXPORT_REQUETES_ERROR_MESSAGES: Record<ExportRequetesErrorCode, string> = {
  START_DATE_REQUIRED: "Renseignez la date de début de l'export. Format attendu : JJ/MM/AAAA",
  END_DATE_REQUIRED: "Renseignez la date de fin de l'export. Format attendu : JJ/MM/AAAA",
  START_AFTER_END: 'La date de début doit être antérieure ou égale à la date de fin',
  END_DATE_IN_FUTURE: 'La date de début doit être antérieure ou égale à la date de fin',
  PERIOD_TOO_LONG: `La période sélectionnée ne peut pas dépasser ${EXPORT_REQUETES_MAX_PERIOD_MONTHS} mois.`,
  NO_REQUETE: 'Aucune requête ne correspond à la période sélectionnée',
  EXPORT_IN_PROGRESS: "Un export est déjà en cours. Vous recevrez un e-mail dès qu'il sera prêt.",
};
