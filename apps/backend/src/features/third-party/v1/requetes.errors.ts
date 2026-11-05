/**
 * The storage failed while uploading the attachment itself, before anything was written to the
 * database: the only failure a client can safely retry, hence a 503 rather than a 500.
 */
export class AttachmentStorageUnavailableError extends Error {
  constructor(cause: unknown) {
    super('Attachment storage is unavailable', { cause });
    this.name = 'AttachmentStorageUnavailableError';
  }
}
