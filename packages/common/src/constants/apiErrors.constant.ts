export const API_ERROR_CODES = {
  FILE_MAX_SIZE: 'FILE_MAX_SIZE',
  FILE_TYPE: 'FILE_TYPE',
};

export type ApiErrorCodes = keyof typeof API_ERROR_CODES;

export const API_ERROR_MESSAGES: Record<keyof typeof API_ERROR_CODES, string> = {
  FILE_MAX_SIZE: 'Le fichier envoyé est trop gros',
  FILE_TYPE: "Le type de fichier n'est pas accepté",
};
