export class EntiteNotFoundError extends Error {
  constructor(message = 'Entite not found') {
    super(message);
    this.name = 'EntiteNotFoundError';
  }
}

export class DirectionOrServiceCreationForbiddenError extends Error {
  constructor(message = 'Direction or Service creation is not allowed for this parent') {
    super(message);
    this.name = 'DirectionOrServiceCreationForbiddenError';
  }
}
