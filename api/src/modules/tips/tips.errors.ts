export class EntradaNotFoundError extends Error {
  constructor(entradaId: string) {
    super(`Entrada ${entradaId} not found`);
    this.name = 'EntradaNotFoundError';
    Object.setPrototypeOf(this, EntradaNotFoundError.prototype);
  }
}

export class CategoryNotFoundError extends Error {
  constructor(categoryId: string) {
    super(`Category ${categoryId} not found`);
    this.name = 'CategoryNotFoundError';
    Object.setPrototypeOf(this, CategoryNotFoundError.prototype);
  }
}

export class MatchNotFoundError extends Error {
  constructor(matchId: string) {
    super(`Match ${matchId} not found`);
    this.name = 'MatchNotFoundError';
    Object.setPrototypeOf(this, MatchNotFoundError.prototype);
  }
}
