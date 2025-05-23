// TODO move in shared package

export const ERROR_CODES = {
  PC_ERROR: 'PC_ERROR',
  USER_INFOS_ERROR: 'USER_INFOS_ERROR',
  STATE_NOT_VALID: 'STATE_NOT_VALID',
  TOKENS_NOT_VALID: 'TOKENS_NOT_VALID',
  CLAIMS_NOT_VALID: 'CLAIMS_NOT_VALID',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
};

export const ERROR_MESSAGES: Record<keyof typeof ERROR_CODES, string> = {
  PC_ERROR: 'pc returned an error',
  USER_INFOS_ERROR: 'pc returned an error while fetching user infos',
  STATE_NOT_VALID: 'state is not valid',
  TOKENS_NOT_VALID: 'tokens are not valid',
  CLAIMS_NOT_VALID: 'claims are not valid',
  USER_NOT_FOUND: 'user not found',
  USER_ALREADY_EXISTS: 'user already exists',
};
