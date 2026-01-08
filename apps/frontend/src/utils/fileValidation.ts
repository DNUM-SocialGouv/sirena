export const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200 Mo (aligné sur demat.social)

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'message/rfc822',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.oasis.opendocument.presentation',
  'application/vnd.ms-outlook',
  'application/x-cfb',
  'text/csv',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
  'image/tiff',
];

export const ALLOWED_EXTENSIONS = [
  '.pdf',
  '.eml',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.odt',
  '.ods',
  '.odp',
  '.msg',
  '.csv',
  '.txt',
  '.png',
  '.jpeg',
  '.jpg',
  '.heic',
  '.heif',
  '.webp',
  '.tiff',
];

export interface FileValidationError {
  type: 'size' | 'format';
  message: string;
}

export const validateFile = (file: File): FileValidationError[] => {
  const errors: FileValidationError[] = [];

  if (file.size > MAX_FILE_SIZE) {
    errors.push({
      type: 'size',
      message: 'Le fichier dépasse la taille maximale autorisée de 200 Mo.',
    });
  }

  const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;

  const isEML = file.name.toLowerCase().endsWith('.eml');
  const isMSG = file.name.toLowerCase().endsWith('.msg');

  const isValidMimeType =
    ALLOWED_MIME_TYPES.includes(file.type) ||
    (isEML && file.type === 'text/plain') ||
    (isMSG && file.type === 'application/x-cfb');

  const isValidExtension = ALLOWED_EXTENSIONS.includes(fileExtension);

  if (!isValidMimeType && !isValidExtension) {
    errors.push({
      type: 'format',
      message:
        "Le format du fichier n'est pas supporté. Formats acceptés : PDF, EML, Word, Excel, PowerPoint, OpenOffice, MSG, CSV, TXT, images (PNG, JPEG, HEIC, WEBP, TIFF).",
    });
  }

  return errors;
};

export const validateFiles = (files: File[]): Record<string, FileValidationError[]> => {
  const fileErrors: Record<string, FileValidationError[]> = {};

  files.forEach((file) => {
    const errors = validateFile(file);
    if (errors.length > 0) {
      fileErrors[file.name] = errors;
    }
  });

  return fileErrors;
};
