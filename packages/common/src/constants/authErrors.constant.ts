export const ERROR_CODES = {
  PC_ERROR: 'PC_ERROR',
  USER_INFOS_ERROR: 'USER_INFOS_ERROR',
  STATE_NOT_VALID: 'STATE_NOT_VALID',
  TOKENS_NOT_VALID: 'TOKENS_NOT_VALID',
  CLAIMS_NOT_VALID: 'CLAIMS_NOT_VALID',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_CREATE_ERROR: 'USER_CREATE_ERROR',
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
  SESSION_ALREADY_EXISTS: 'SESSION_ALREADY_EXISTS',
  SESSION_CREATE_ERROR: 'SESSION_CREATE_ERROR',
};

export const ERROR_MESSAGES: Record<keyof typeof ERROR_CODES, string> = {
  PC_ERROR: 'PC a retourné une erreur',
  USER_INFOS_ERROR: 'PC a retourné une erreur lors de la récupération des informations utilisateur',
  STATE_NOT_VALID: "L'état n'est pas valide",
  TOKENS_NOT_VALID: 'Les jetons ne sont pas valides',
  CLAIMS_NOT_VALID: 'Les revendications ne sont pas valides',
  USER_NOT_FOUND: 'Utilisateur non trouvé',
  USER_ALREADY_EXISTS: "L'utilisateur existe déjà",
  USER_CREATE_ERROR: "Erreur lors de la création de l'utilisateur",
  SESSION_ALREADY_EXISTS: 'La session existe déjà',
  SESSION_CREATE_ERROR: 'Erreur lors de la création de la session',
};
