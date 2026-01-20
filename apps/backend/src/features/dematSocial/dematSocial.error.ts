import type { RootChampFragmentFragment } from '../../libs/graffle.js';
import type { RepetitionChamp } from './dematSocial.type.js';

export class ChampMappingError extends Error {
  constructor(
    public readonly champ: RootChampFragmentFragment | RepetitionChamp,
    public readonly type: string,
    public readonly message: string,
    public readonly cause?: string,
  ) {
    super(message);
    this.name = 'ChampMappingError';
  }
}

export class EnumNotFound extends Error {
  constructor(public readonly message: string) {
    super(message);
    this.name = 'EnumNotFound';
  }
}
