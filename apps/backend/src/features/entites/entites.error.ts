export class EntiteNotFoundError extends Error {
  constructor(message = 'Entite not found') {
    super(message);
    this.name = 'EntiteNotFoundError';
  }
}

export class EntiteChildCreationForbiddenError extends Error {
  constructor(message = 'Child entite creation is not allowed for this parent') {
    super(message);
    this.name = 'EntiteChildCreationForbiddenError';
  }
}
