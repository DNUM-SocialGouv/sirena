export class EntiteNotFoundError extends Error {
  constructor(message = 'Entite not found') {
    super(message);
    this.name = 'EntiteNotFoundError';
  }
}
